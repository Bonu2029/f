/**
 * Checks whether this app is actually wired to its providers.
 *
 *   npm run doctor
 *
 * `env:check` answers "are the variables set?". This answers the harder and more
 * useful question: "do they work?" It makes real, read-only calls to Supabase,
 * Vapi and Stripe and reports what came back.
 *
 * It never prints a credential, or part of one. It never writes anything.
 *
 * Exit code is 1 when something that blocks the app is broken, so it can gate a
 * deploy or a support handoff.
 */
import { WEBHOOK_URL_FIX, webhookUrlProblem } from '@afd/shared';
import { loadEnvFiles } from './load-env';

const envFiles = loadEnvFiles();

/* -------------------------------------------------------------------------- */

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

type Status = 'ok' | 'fail' | 'warn' | 'skip';

const ICON: Record<Status, string> = {
  ok: green('  OK  '),
  fail: red(' FAIL '),
  warn: yellow(' WARN '),
  skip: dim(' SKIP '),
};

let blocking = 0;

function report(status: Status, label: string, detail?: string, fix?: string) {
  console.log(`${ICON[status]} ${label}`);
  if (detail) console.log(`       ${dim(detail)}`);
  if (fix) console.log(`       ${yellow('→ ' + fix)}`);
  if (status === 'fail') blocking += 1;
}

function section(title: string) {
  console.log(`\n${bold(title)}`);
}

function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : undefined;
}

/** Strips the API path off a Supabase URL, matching what the app does. */
function normalizeUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(rest|auth|storage|realtime|functions)\/v\d+$/i, '');
}

async function json(
  url: string,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown; error?: string }> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      /* keep the raw text */
    }
    return { status: res.status, body };
  } catch (err) {
    return { status: 0, body: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Every table the MVP reads or writes. */
const MVP_TABLES = [
  'profiles',
  'organizations',
  'organization_members',
  'business_profiles',
  'services',
  'faqs',
  'ai_agents',
  'phone_numbers',
  'calls',
  'leads',
  'appointments',
  'subscriptions',
  'usage_ledger',
  'founder_claims',
];

/* -------------------------------------------------------------------------- */

async function checkSupabase() {
  section('Supabase');

  const rawUrl = read('NEXT_PUBLIC_SUPABASE_URL');
  const publicKey =
    read('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ?? read('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const secretKey = read('SUPABASE_SERVICE_ROLE_KEY');

  if (!rawUrl || !publicKey) {
    report(
      'fail',
      'Configuration',
      'NEXT_PUBLIC_SUPABASE_URL and a publishable/anon key are both required.',
      'Fill them in .env.local — see .env.example.',
    );
    return;
  }

  const url = normalizeUrl(rawUrl);
  if (url !== rawUrl.replace(/\/+$/, '')) {
    report(
      'warn',
      'Project URL',
      `You set an API endpoint; the app uses ${url}`,
      'Paste the bare project URL instead — it avoids this whole class of confusion.',
    );
  }

  // --- Auth service ---------------------------------------------------------
  const auth = await json(`${url}/auth/v1/settings`, { headers: { apikey: publicKey } });
  if (auth.status === 200) {
    report('ok', 'Auth service reachable');
  } else {
    report(
      'fail',
      'Auth service',
      auth.error ?? `HTTP ${auth.status}`,
      'Check the project URL, and that the project is not paused in the Supabase dashboard.',
    );
    return;
  }

  // --- Public key valid? ----------------------------------------------------
  // A wrong key returns "Invalid API key"; a right key against a missing table
  // returns PGRST205. Telling those apart is the whole point of this check —
  // otherwise "it doesn't work" could equally mean bad credentials or no schema.
  const headers = { apikey: publicKey, Authorization: `Bearer ${publicKey}` };
  const probe = await json(`${url}/rest/v1/organizations?select=id&limit=1`, { headers });
  const code = (probe.body as { code?: string; message?: string } | null) ?? {};

  if (code.message === 'Invalid API key') {
    report(
      'fail',
      'Publishable key',
      'Supabase rejected it.',
      'Copy it again from Settings → API Keys. Do not use the secret key here.',
    );
    return;
  }
  report('ok', 'Publishable key accepted');

  // --- Schema ---------------------------------------------------------------
  const missing: string[] = [];
  for (const table of MVP_TABLES) {
    const res = await json(`${url}/rest/v1/${table}?select=*&limit=1`, { headers });
    const b = (res.body as { code?: string } | null) ?? {};
    // PGRST205 = not in the schema cache, i.e. the table does not exist.
    // Anything else — including a permission error — means it does.
    if (b.code === 'PGRST205') missing.push(table);
  }

  if (missing.length === MVP_TABLES.length) {
    report(
      'fail',
      'Database schema',
      'The database is empty — not one of the 14 tables exists.',
      'Paste supabase/migrations/bundle.sql into Supabase → SQL Editor → New query → Run.',
    );
    return;
  }
  if (missing.length > 0) {
    report(
      'fail',
      'Database schema',
      `${missing.length} of ${MVP_TABLES.length} tables missing: ${missing.join(', ')}`,
      'The migration did not finish. Re-read the SQL editor output for the first error.',
    );
  } else {
    report('ok', 'Database schema', `all ${MVP_TABLES.length} tables present`);
  }

  // --- RLS actually blocking? ----------------------------------------------
  // The publishable key is anonymous here, so a correctly-secured table returns
  // an empty array. Rows coming back would mean the data is world-readable.
  if (!missing.includes('organizations')) {
    const rls = await json(`${url}/rest/v1/organizations?select=id&limit=1`, { headers });
    if (Array.isArray(rls.body) && rls.body.length === 0) {
      report('ok', 'Row-level security', 'anonymous reads return nothing, as they must');
    } else if (Array.isArray(rls.body)) {
      report(
        'fail',
        'Row-level security',
        `An anonymous request read ${rls.body.length} organisation row(s). Tenant data is public.`,
        'Re-run 0002_rls.sql. Do NOT put real customer data in until this passes.',
      );
    } else {
      report('ok', 'Row-level security', 'anonymous reads are refused');
    }
  }

  // --- Service role key -----------------------------------------------------
  if (!secretKey) {
    report(
      'fail',
      'Service role key',
      'SUPABASE_SERVICE_ROLE_KEY is not set — every server-side write will fail.',
      'Settings → API Keys → secret key. Server-only: never prefix it NEXT_PUBLIC_.',
    );
  } else if (secretKey.startsWith('sb_publishable_')) {
    report(
      'fail',
      'Service role key',
      'This is the publishable key, not the secret one.',
      'Use the secret key (sb_secret_… or service_role).',
    );
  } else if (missing.length === MVP_TABLES.length) {
    report('skip', 'Service role key', 'nothing to read until the schema exists');
  } else {
    const svc = await json(`${url}/rest/v1/organizations?select=id&limit=1`, {
      headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
    });
    const b = (svc.body as { message?: string } | null) ?? {};
    if (b.message === 'Invalid API key') {
      report('fail', 'Service role key', 'Supabase rejected it.', 'Copy it again from Settings → API Keys.');
    } else {
      report('ok', 'Service role key accepted');
    }
  }
}

/* -------------------------------------------------------------------------- */

async function checkVapi() {
  section('Vapi');

  const key = read('VAPI_API_KEY');
  const secret = read('VAPI_WEBHOOK_SECRET');
  const demo = (read('DEMO_MODE') ?? 'false').toLowerCase();
  const isDemo = demo === 'true' || demo === '1';

  if (key && isDemo) {
    // Both set is a contradiction, and the losing one is the key. Without this
    // line the symptom is a real key, a green-looking dashboard, and assistant
    // ids that quietly begin `demo_`.
    report(
      'warn',
      'API key is being ignored',
      'VAPI_API_KEY is set but DEMO_MODE=true, so the app uses mock adapters and creates nothing at Vapi.',
      'Set DEMO_MODE=false to use the key you configured.',
    );
  }

  if (!key) {
    report(
      isDemo ? 'skip' : 'warn',
      'API key',
      isDemo
        ? 'DEMO_MODE is on — the app uses mock adapters and places no real calls.'
        : 'Not set. The app falls back to mock adapters, so no real call is answered.',
      isDemo ? undefined : 'Add VAPI_API_KEY, or set DEMO_MODE=true to make the fallback explicit.',
    );
  } else if (isDemo) {
    /* Already reported above; do not also claim the key is in use. */
  } else {
    const res = await json('https://api.vapi.ai/assistant?limit=1', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.status === 200) {
      const n = Array.isArray(res.body) ? res.body.length : 0;
      report('ok', 'API key accepted', `${n === 0 ? 'no' : n} assistant(s) visible`);
    } else if (res.status === 401 || res.status === 403) {
      report(
        'fail',
        'API key',
        'Vapi rejected it.',
        'Use the PRIVATE key from the Vapi dashboard, not the public one.',
      );
    } else {
      report('warn', 'API key', res.error ?? `Vapi returned HTTP ${res.status}`);
    }
  }

  if (!secret) {
    report(
      isDemo ? 'skip' : 'fail',
      'Webhook secret',
      'VAPI_WEBHOOK_SECRET is not set — call reports cannot be verified, so calls go unrecorded.',
      isDemo ? undefined : "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  } else if (secret.length < 24) {
    report('warn', 'Webhook secret', 'Shorter than 24 characters.', 'Use 32 random bytes.');
  } else {
    report('ok', 'Webhook secret set');
  }

  // The same predicate the app refuses to sync on, so this cannot drift from
  // the behaviour it is meant to predict.
  const callbackUrl = `${(read('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000').replace(/\/+$/, '')}/api/webhooks/vapi`;
  const problem = webhookUrlProblem(callbackUrl);

  if (!problem) {
    report('ok', 'Webhook URL', callbackUrl);
  } else if (isDemo || !key) {
    report(
      'skip',
      'Webhook URL',
      `${problem} No real assistant is created in this mode, so nothing is lost.`,
    );
  } else {
    report(
      'fail',
      'Webhook URL',
      `${problem} The app refuses to sync an assistant in this state, so no calls can be answered until it is fixed.`,
      WEBHOOK_URL_FIX,
    );
  }
}

/* -------------------------------------------------------------------------- */

/**
 * Text messages. Not required — a business with no SMS provider still books —
 * but the receptionist's wording depends on this, so "off" has to be visible
 * rather than inferred from a customer complaining they were never confirmed.
 */
async function checkSms() {
  section('Text messages (Twilio)');

  const sid = read('TWILIO_ACCOUNT_SID');
  const token = read('TWILIO_AUTH_TOKEN');
  const from = read('TWILIO_FROM_NUMBER');

  if (!sid && !token && !from) {
    report(
      'skip',
      'Not configured',
      'No confirmation texts are sent. The receptionist will not promise one, and will read the time back to the caller instead.',
    );
    return;
  }

  const missing = [
    !sid ? 'TWILIO_ACCOUNT_SID' : null,
    !token ? 'TWILIO_AUTH_TOKEN' : null,
    !from ? 'TWILIO_FROM_NUMBER' : null,
  ].filter(Boolean);

  if (missing.length) {
    // Partly configured is worse than not configured: it looks deliberate.
    report(
      'fail',
      'Half configured',
      `Missing ${missing.join(', ')}. Texts cannot be sent, and the partial setup hides that.`,
      'Set all three, or remove the ones that are set.',
    );
    return;
  }

  const res = await json(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}` },
  });

  if (res.status === 200) {
    report('ok', 'Credentials accepted', `sending from ${from}`);
  } else if (res.status === 401) {
    report('fail', 'Credentials', 'Twilio rejected them.', 'Check the auth token in the Twilio console.');
  } else {
    report('warn', 'Credentials', res.error ?? `Twilio returned HTTP ${res.status}`);
  }
}

/* -------------------------------------------------------------------------- */

async function checkStripe() {
  section('Stripe');

  const key = read('STRIPE_SECRET_KEY');
  if (!key) {
    report('warn', 'Secret key', 'Not set — nobody can subscribe. Everything else still works.');
    return;
  }

  const res = await json('https://api.stripe.com/v1/prices?limit=1', {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (res.status === 200) {
    report('ok', 'Secret key accepted', key.includes('_test_') ? 'test mode' : 'LIVE mode');
  } else {
    report('fail', 'Secret key', `Stripe returned HTTP ${res.status}`, 'Copy it again from the Stripe dashboard.');
  }

  for (const [name, why] of [
    ['STRIPE_FOUNDER_PRICE_ID', 'Founding Member checkout'],
    ['STRIPE_STANDARD_PRICE_ID', 'standard checkout'],
  ] as const) {
    const id = read(name);
    if (!id) {
      report('warn', name, `Not set — ${why} will fail.`, 'Run: npm run stripe:setup');
      continue;
    }
    const price = await json(`https://api.stripe.com/v1/prices/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    report(
      price.status === 200 ? 'ok' : 'fail',
      name,
      price.status === 200 ? 'exists in this account' : `Stripe returned HTTP ${price.status}`,
      price.status === 200 ? undefined : 'The id may belong to the other mode (test vs live).',
    );
  }
}

/* -------------------------------------------------------------------------- */

async function main() {
  console.log(`\n${bold('AI Front Desk — connection doctor')}`);
  console.log(dim('Read-only. Nothing is written, and no credential is printed.'));
  console.log(
    envFiles.length
      ? dim(`Env loaded from: ${envFiles.join(', ')}`)
      : yellow('No .env file found. Next.js reads apps/web/.env.local — put it there.'),
  );
  if (envFiles.includes('.env.local') && !envFiles.includes('apps/web/.env.local')) {
    report(
      'warn',
      'Env file location',
      'Only the root .env.local exists. Next.js does NOT read it — `npm run dev` will fail with MissingEnvError while this tool reports fine.',
      'Move it to apps/web/.env.local.',
    );
  }

  await checkSupabase();
  await checkVapi();
  await checkSms();
  await checkStripe();

  console.log('');
  if (blocking > 0) {
    console.log(red(`${blocking} blocking problem(s).`), 'Fix the FAIL lines above, then re-run.\n');
    process.exit(1);
  }
  console.log(green('No blocking problems.\n'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
