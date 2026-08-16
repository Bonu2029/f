/**
 * Reports which environment variables are set, which are missing, and what
 * breaks without each one.
 *
 *   npm run env:check
 *
 * Reads `.env.local` then `.env`, the same order Next.js does. Prints values'
 * presence and shape only — never a value, not even a prefix.
 *
 * Exit code is 1 when something in the REQUIRED group is missing, so this can
 * gate a deploy.
 */
import { loadEnvFiles } from './load-env';

const envFiles = loadEnvFiles();

type Group = 'required' | 'voice' | 'billing' | 'optional' | 'migrations';

interface Check {
  /** Accepted names, in preference order. The first one set wins. */
  names: string[];
  group: Group;
  /** What stops working without it. */
  why: string;
  /** Optional shape check — catches the mis-paste, not just the absence. */
  validate?: (value: string) => string | null;
}

const CHECKS: Check[] = [
  {
    names: ['NEXT_PUBLIC_APP_URL'],
    group: 'required',
    why: 'Stripe return URLs, and the webhook URL written into every Vapi assistant',
    validate: (v) =>
      /^https?:\/\/[^\s]+$/.test(v)
        ? v.endsWith('/')
          ? 'has a trailing slash — remove it'
          : null
        : 'must be a full origin, e.g. https://app.example.com',
  },
  {
    names: ['NEXT_PUBLIC_SUPABASE_URL'],
    group: 'required',
    why: 'every database and auth call',
    validate: (v) =>
      /\/(rest|auth|storage|realtime|functions)\/v\d+\/?$/i.test(v)
        ? 'looks like an API endpoint, not the project URL — the app strips the path, but paste the bare origin'
        : /^https?:\/\/[^\s]+$/.test(v)
          ? null
          : 'must be a full URL',
  },
  {
    names: ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    group: 'required',
    why: 'signing in — this is the public, RLS-constrained key',
    validate: (v) =>
      v.startsWith('sb_secret_') || v.startsWith('sb_publishable_') || v.startsWith('ey')
        ? v.startsWith('sb_secret_')
          ? 'this is the SECRET key — it must never be NEXT_PUBLIC_. Use the publishable key'
          : null
        : 'does not look like a Supabase key',
  },
  {
    names: ['SUPABASE_SERVICE_ROLE_KEY'],
    group: 'required',
    why: 'every server-side write; without it nothing past the login screen works',
    validate: (v) =>
      v.startsWith('sb_publishable_')
        ? 'this is the PUBLISHABLE key — the server needs the secret/service_role key'
        : null,
  },
  {
    names: ['APP_ENCRYPTION_KEY'],
    group: 'required',
    why: 'encryption at rest and invitation-token hashing',
    validate: (v) =>
      Buffer.from(v, 'base64').length === 32
        ? null
        : 'must be exactly 32 bytes, base64 encoded — see .env.example for the one-liner',
  },

  {
    names: ['VAPI_API_KEY'],
    group: 'voice',
    why: 'creating assistants and buying numbers. Without it the app runs on mock adapters',
    validate: (v) =>
      v.startsWith('sk_') || v.length > 20 ? null : 'shorter than any Vapi key — check you copied it all',
  },
  {
    names: ['VAPI_WEBHOOK_SECRET'],
    group: 'voice',
    why: 'proving a call report really came from Vapi. Calls would go unrecorded',
    validate: (v) => (v.length >= 24 ? null : 'too short to be a useful shared secret — use 32 random bytes'),
  },

  { names: ['STRIPE_SECRET_KEY'], group: 'billing', why: 'checkout and the customer portal' },
  { names: ['STRIPE_WEBHOOK_SECRET'], group: 'billing', why: 'activating subscriptions — the webhook is authoritative' },
  { names: ['STRIPE_FOUNDER_PRICE_ID'], group: 'billing', why: 'Founding Member checkout' },
  { names: ['STRIPE_STANDARD_PRICE_ID'], group: 'billing', why: 'standard checkout' },

  { names: ['SUPABASE_DB_URL'], group: 'migrations', why: '`npm run db:migrate`. Not needed at runtime' },

  { names: ['ADMIN_EMAILS'], group: 'optional', why: 'access to /admin. Nobody can reach it while unset' },
  { names: ['CRON_SECRET'], group: 'optional', why: '/api/cron/maintenance. Founder slots leak without it' },
  { names: ['STRIPE_OVERAGE_PRICE_ID'], group: 'optional', why: 'billing minutes beyond the plan allowance' },
  { names: ['RESEND_API_KEY'], group: 'optional', why: 'real email. Falls back to logging to the console' },
];

const GROUP_LABEL: Record<Group, string> = {
  required: 'REQUIRED — the app cannot serve a signed-in page without these',
  voice: 'VOICE — without these the receptionist runs on mock adapters and answers no real calls',
  billing: 'BILLING — without these nobody can subscribe',
  migrations: 'MIGRATIONS — only needed to run `npm run db:migrate`',
  optional: 'OPTIONAL — each degrades a specific feature, nothing else',
};

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : undefined;
}

const demoMode = (read('DEMO_MODE') ?? 'false').toLowerCase();
const isDemo = demoMode === 'true' || demoMode === '1';

let missingRequired = 0;
let warnings = 0;

console.log('\nAI Front Desk — environment check\n');
console.log(
  envFiles.length
    ? dim(`Env loaded from: ${envFiles.join(', ')}`)
    : yellow('No .env file found. Next.js reads apps/web/.env.local — put it there.'),
);
if (envFiles.includes('.env.local') && !envFiles.includes('apps/web/.env.local')) {
  console.log(
    yellow(
      '\nOnly the root .env.local exists. Next.js does NOT read it: `npm run dev` will fail\n' +
        'with MissingEnvError while this check reports fine. Move it to apps/web/.env.local.',
    ),
  );
}
if (isDemo) {
  console.log(
    yellow('DEMO_MODE=true') +
      dim(' — Vapi and Stripe run on mock adapters. Nothing below marked VOICE or BILLING\n') +
      dim('  is needed to click through the app, but no real call is placed and no card is charged.\n'),
  );
}

for (const group of ['required', 'voice', 'billing', 'migrations', 'optional'] as Group[]) {
  const checks = CHECKS.filter((c) => c.group === group);
  console.log(`\n${GROUP_LABEL[group]}`);

  for (const check of checks) {
    const name = check.names.find((n) => read(n));
    const value = name ? read(name)! : undefined;
    const label = check.names.join(' or ');

    if (!value) {
      if (group === 'required') missingRequired += 1;
      console.log(`  ${red('MISSING')}  ${label}`);
      console.log(`           ${dim(check.why)}`);
      continue;
    }

    const problem = check.validate?.(value);
    if (problem) {
      warnings += 1;
      console.log(`  ${yellow('CHECK')}    ${name}`);
      console.log(`           ${yellow(problem)}`);
    } else {
      console.log(`  ${green('set')}      ${name} ${dim(`(${value.length} chars)`)}`);
    }
  }
}

console.log('');
if (missingRequired > 0) {
  console.log(red(`${missingRequired} required variable(s) missing.`), 'See .env.example.\n');
  process.exit(1);
}
if (warnings > 0) {
  console.log(yellow(`All required variables set, but ${warnings} need a look.\n`));
  process.exit(0);
}
console.log(green('All required variables set.\n'));
