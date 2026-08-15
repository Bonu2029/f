/**
 * Standalone sweep for lapsed Founding Member reservations.
 *
 * The same work runs from `/api/cron/maintenance`; this script exists for
 * operators who would rather schedule a container job than an HTTP cron.
 *
 *   npm run founder:expire
 */
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: ['.env.local', '.env'], quiet: true });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc('expire_founder_reservations');
  if (error) {
    console.error('Sweep failed:', error.message);
    process.exit(1);
  }

  const { data: stats } = await supabase.rpc('founder_slot_stats');
  const row = Array.isArray(stats) ? stats[0] : stats;
  console.log(`Expired ${data ?? 0} reservation(s).`);
  if (row) {
    console.log(`Founding 50: ${row.active} active, ${row.reserved} reserved, ${row.remaining} remaining.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
