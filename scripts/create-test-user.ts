/**
 * Creates a confirmed test account, so auth can be verified without an inbox.
 *
 *   npm run test:user
 *   npm run test:user -- --email you@example.com --business "Daniel's HVAC"
 *
 * Why this rather than turning email confirmation off in the Supabase
 * dashboard: switching that off changes a project-wide security setting that
 * someone then has to remember to switch back, and it silently weakens the real
 * signup path. This creates one user, through the documented Admin API, using
 * the service-role key you already have. Nothing about the project changes.
 *
 * It sets the same `user_metadata` the signup form does, because
 * `/onboarding/start` reads `business_name` from there to create the
 * organisation. A user created without it would land on a broken page and look
 * like an application bug.
 *
 * Prints the password once. It is generated, not read from anywhere, so losing
 * it just means running this again.
 */
import { randomBytes } from 'node:crypto';
import { loadEnvFiles } from './load-env';

loadEnvFiles();

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : undefined;
}

function normalizeUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(rest|auth|storage|realtime|functions)\/v\d+$/i, '');
}

async function main() {
  const rawUrl = read('NEXT_PUBLIC_SUPABASE_URL');
  const secretKey = read('SUPABASE_SERVICE_ROLE_KEY');

  if (!rawUrl || !secretKey) {
    console.error(
      red('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are both required.'),
      '\nRun `npm run doctor` first.',
    );
    process.exit(1);
  }
  if (secretKey.startsWith('sb_publishable_')) {
    console.error(red('SUPABASE_SERVICE_ROLE_KEY holds the publishable key. This needs the secret key.'));
    process.exit(1);
  }

  const url = normalizeUrl(rawUrl);

  // `example.com` is rejected by Supabase's address validation, which is the
  // trap that wasted a round on this before. `.test` is reserved by RFC 2606
  // and accepted.
  const email = (arg('email') ?? `owner+${Date.now()}@aifrontdesk.test`).toLowerCase();
  const business = arg('business') ?? 'Test Business';
  const firstName = arg('first') ?? 'Test';
  const lastName = arg('last') ?? 'Owner';

  // 24 bytes of base64url easily satisfies the password policy in schemas.ts.
  const password = arg('password') ?? `${randomBytes(18).toString('base64url')}aA1!`;

  const headers = {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  };

  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password,
      // The whole point: skip the inbox round-trip without weakening the
      // project-wide setting that governs real signups.
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        business_name: business,
      },
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;

  if (!res.ok) {
    const message = String(body?.msg ?? body?.message ?? body?.error_description ?? `HTTP ${res.status}`);
    console.error(`\n${red('Could not create the user.')} ${message}\n`);
    if (/already been registered|already exists/i.test(message)) {
      console.error(dim('That address already exists. Pass a different --email, or reuse the old password.\n'));
    }
    if (res.status === 401 || res.status === 403) {
      console.error(dim('The service-role key was rejected. Re-copy it from Settings → API Keys.\n'));
    }
    process.exit(1);
  }

  const id = String(body?.id ?? '');

  console.log(`\n${bold('Confirmed test user created')}\n`);
  console.log(`  email     ${green(email)}`);
  console.log(`  password  ${green(password)}   ${dim('(shown once — not stored anywhere)')}`);
  console.log(`  business  ${business}`);
  console.log(`  user id   ${dim(id)}\n`);

  console.log(bold('Next:'));
  console.log('  1. npm run dev');
  console.log('  2. Sign in at http://localhost:3000/login');
  console.log('  3. You should land on /onboarding/start, which creates the organisation');
  console.log('     from the business name above, then offers a plan.');
  console.log(
    `  4. ${dim('With DEMO_MODE=true, checkout is simulated — no card, no charge. It lands')}`,
  );
  console.log(`     ${dim('on /dashboard/settings/business with the subscription marked as demo.')}\n`);
  console.log(
    yellow('This account is real. Delete it from Supabase → Authentication → Users when finished.\n'),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
