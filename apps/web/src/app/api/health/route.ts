import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { integrationStatus, workerEnv, DEMO_MODE } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Liveness and readiness probe.
 *
 * Reports which integrations are CONFIGURED — never their values, never a
 * partial key. Safe to expose publicly; it is what the admin health panel and
 * an uptime monitor both read.
 */
export async function GET() {
  const started = Date.now();
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  try {
    const svc = getServiceSupabase();
    const { error } = await svc.from('organizations').select('id', { head: true, count: 'exact' }).limit(1);
    checks.database = error ? { ok: false, detail: 'query failed' } : { ok: true };
  } catch {
    checks.database = { ok: false, detail: 'not configured' };
  }

  try {
    const res = await fetch(`${workerEnv.url}/health`, { signal: AbortSignal.timeout(2500) });
    checks.voice_worker = res.ok ? { ok: true } : { ok: false, detail: `status ${res.status}` };
  } catch {
    checks.voice_worker = { ok: false, detail: 'unreachable' };
  }

  const integrations = integrationStatus();
  const healthy = checks.database?.ok === true;

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      demo_mode: DEMO_MODE,
      uptime_ms: Math.round(process.uptime() * 1000),
      response_ms: Date.now() - started,
      checks,
      integrations,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  );
}
