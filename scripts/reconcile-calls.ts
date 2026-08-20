/**
 * Compares the calls Vapi says happened against the calls we recorded.
 *
 *   npm run calls:reconcile
 *
 * The webhook is the only path from a real conversation into this product, and
 * every way it can fail is quiet: an unreachable callback URL, a rejected
 * secret, a tenant that cannot be resolved, a write whose error nobody read.
 * In all of them the dashboard looks calm and simply shows fewer calls than
 * happened — which is indistinguishable from a quiet week.
 *
 * So this asks the provider directly. Vapi is the authority on what happened;
 * our database is the thing being checked. It reads both and reports the
 * difference. It writes nothing, invents nothing, and prints no credential.
 *
 * Exit code is 1 when Vapi knows about a call we do not, so it can gate a
 * deploy or end an argument about whether calls are being captured.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFiles } from './load-env';

loadEnvFiles();

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

interface VapiCall {
  id: string;
  assistantId?: string;
  status?: string;
  endedReason?: string;
  type?: string;
  createdAt?: string;
  startedAt?: string;
  endedAt?: string;
}

const LIMIT = Number(process.env.RECONCILE_LIMIT ?? 25);

async function main() {
  const key = process.env.VAPI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    console.error('VAPI_API_KEY is not set, so there is nothing to compare against.');
    process.exit(1);
  }
  if (!supabaseUrl || !serviceKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
  }

  /* ---- What Vapi says happened ------------------------------------------ */
  const res = await fetch(`https://api.vapi.ai/call?limit=${LIMIT}`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    console.error(
      res.status === 401 || res.status === 403
        ? 'Vapi rejected the API key. Use the PRIVATE key from the dashboard.'
        : `Vapi returned HTTP ${res.status}.`,
    );
    process.exit(1);
  }

  const calls = (await res.json()) as VapiCall[];
  if (!Array.isArray(calls) || calls.length === 0) {
    console.log(dim('Vapi has no calls on this account yet. Nothing to reconcile.'));
    return;
  }

  /* ---- What we recorded -------------------------------------------------- */
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: rows, error } = await db
    .from('calls')
    .select('vapi_call_id, result, ended_reason, transcript, summary, organization_id')
    .in(
      'vapi_call_id',
      calls.map((c) => c.id),
    );

  if (error) {
    console.error(`Could not read the calls table: ${error.message}`);
    process.exit(1);
  }

  const recorded = new Map((rows ?? []).map((r) => [r.vapi_call_id as string, r]));

  /* ---- The difference ---------------------------------------------------- */
  console.log(`\n${bold(`Last ${calls.length} call(s) at Vapi`)}\n`);

  let missing = 0;
  for (const call of calls) {
    const local = recorded.get(call.id);
    const when = (call.startedAt ?? call.createdAt ?? '').replace('T', ' ').slice(0, 19);

    if (!local) {
      missing += 1;
      console.log(`${red(' MISSING ')} ${call.id}`);
      console.log(`          ${dim(`${when} · ${call.type ?? 'call'} · ${call.endedReason ?? call.status ?? ''}`)}`);
      continue;
    }

    // Recorded, but is it readable? A call with neither transcript nor summary
    // is a row the owner can do nothing with, and worth distinguishing from a
    // call that came through whole.
    const readable = Boolean(local.transcript) || Boolean(local.summary);
    console.log(
      `${readable ? green(' RECORDED') : yellow(' EMPTY   ')} ${call.id}`,
    );
    console.log(
      `          ${dim(`${when} · ${local.result} · ${local.ended_reason ?? call.endedReason ?? ''}`)}`,
    );
  }

  console.log('');
  if (missing > 0) {
    console.log(
      red(
        `${missing} of ${calls.length} call(s) never reached this database. ` +
          'Those conversations happened and the business cannot see them.',
      ),
    );
    console.log(
      yellow(
        '→ Check, in this order: npm run doctor (webhook URL reachable?), the ' +
          'webhook_events table (secret accepted?), and the dev server log for ' +
          'the call id above.',
      ),
    );
    process.exit(1);
  }

  console.log(green(`All ${calls.length} call(s) Vapi knows about are recorded here.`));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
