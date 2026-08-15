import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { config } from './config.js';
import { log } from './logger.js';
import { CallSession } from './call-session.js';

/**
 * Voice worker HTTP service.
 *
 * A deliberately small surface:
 *   GET  /health        — liveness and current call count
 *   POST /calls/accept  — the web app hands over an inbound call
 *
 * This runs on a persistent Node host (Docker) rather than a serverless
 * platform, because a phone call needs a WebSocket held open for minutes at a
 * time and serverless request handlers cannot do that safely.
 */

const acceptSchema = z.object({
  openai_call_id: z.string().min(1).max(200),
  call_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  caller_phone: z.string().max(30).nullable().optional(),
  business_phone: z.string().max(30).nullable().optional(),
});

const activeCalls = new Map<string, CallSession>();
const startedAt = Date.now();

function authorised(req: IncomingMessage): boolean {
  const header = req.headers.authorization ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(presented);
  const b = Buffer.from(config.workerSecret);
  return a.length === b.length && timingSafeEqual(a, b);
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  res.end(payload);
}

async function readBody(req: IncomingMessage, limitBytes = 64 * 1024): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > limitBytes) throw new Error('Request body too large');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

const server = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    // ---- Health -----------------------------------------------------------
    if (req.method === 'GET' && url.pathname === '/health') {
      json(res, 200, {
        status: 'ok',
        service: 'voice-worker',
        uptime_ms: Date.now() - startedAt,
        active_calls: activeCalls.size,
        model: config.realtimeModel,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // ---- Accept a call ----------------------------------------------------
    if (req.method === 'POST' && url.pathname === '/calls/accept') {
      if (!authorised(req)) {
        json(res, 403, { error: { message: 'Forbidden' } });
        return;
      }

      let parsed: z.infer<typeof acceptSchema>;
      try {
        parsed = acceptSchema.parse(JSON.parse(await readBody(req)));
      } catch (err) {
        json(res, 400, {
          error: { message: err instanceof Error ? err.message : 'Invalid request body' },
        });
        return;
      }

      if (activeCalls.has(parsed.call_id)) {
        // Duplicate dispatch — already handling this call.
        json(res, 200, { accepted: true, duplicate: true });
        return;
      }

      const session = new CallSession(
        {
          openaiCallId: parsed.openai_call_id,
          callId: parsed.call_id,
          organizationId: parsed.organization_id,
          callerPhone: parsed.caller_phone ?? null,
          businessPhone: parsed.business_phone ?? null,
        },
        (callId) => activeCalls.delete(callId),
      );

      activeCalls.set(parsed.call_id, session);

      try {
        await session.start();
        json(res, 200, { accepted: true, active_calls: activeCalls.size });
      } catch (err) {
        activeCalls.delete(parsed.call_id);
        log.error('call could not be started', {
          call_id: parsed.call_id,
          organization_id: parsed.organization_id,
          error: err instanceof Error ? err.message : String(err),
        });
        // A non-200 tells the web app to fall back to the business's own number
        // rather than leaving the caller in silence.
        json(res, 502, { error: { message: 'Call could not be started' } });
      }
      return;
    }

    json(res, 404, { error: { message: 'Not found' } });
  })().catch((err: unknown) => {
    log.error('unhandled request error', { error: err instanceof Error ? err.message : String(err) });
    if (!res.headersSent) json(res, 500, { error: { message: 'Internal error' } });
  });
});

server.listen(config.port, () => {
  log.info('voice worker listening', {
    event: 'server.start',
    port: config.port,
    model: config.realtimeModel,
    web_internal_url: config.webInternalUrl,
  });
});

/**
 * Graceful shutdown: stop accepting new calls, let in-flight calls finish so
 * their usage and summaries are recorded, then exit.
 */
function shutdown(signal: string) {
  log.info('shutting down', { event: 'server.shutdown', signal, active_calls: activeCalls.size });
  server.close();

  const deadline = Date.now() + 30_000;
  const timer = setInterval(() => {
    if (activeCalls.size === 0 || Date.now() > deadline) {
      clearInterval(timer);
      if (activeCalls.size > 0) {
        log.warn('exiting with calls still active', { active_calls: activeCalls.size });
      }
      process.exit(0);
    }
  }, 1000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  log.error('unhandled promise rejection', {
    error: reason instanceof Error ? reason.message : String(reason),
  });
});
