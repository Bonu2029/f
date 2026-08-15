import { config } from './config.js';
import { log } from './logger.js';

/**
 * Typed client for the web app's internal call API.
 *
 * Every request carries the shared worker secret. The web app re-derives the
 * organisation from the call record rather than trusting what we send, so a
 * compromised worker still cannot reach another tenant's data.
 */

export interface SessionConfig {
  model: string;
  voice: string;
  instructions: string;
  tools: Array<{ type: 'function'; name: string; description: string; parameters: Record<string, unknown> }>;
  timezone: string;
  greeting: string;
  transfer_enabled: boolean;
  fallback_phone: string | null;
  is_demo: boolean;
}

export interface ToolOutcome {
  result: { ok: boolean; data?: unknown; message?: string; error?: string };
  side_effect?: { type: 'transfer'; destination: string } | { type: 'hangup'; disposition: string };
}

async function request<T>(path: string, body: unknown, timeoutMs = 20_000): Promise<T> {
  const res = await fetch(`${config.webInternalUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${config.workerSecret}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Internal API returned non-JSON (${res.status})`);
  }

  if (!res.ok) {
    const message =
      (json as { error?: { message?: string } })?.error?.message ?? `Internal API returned ${res.status}`;
    throw new Error(message);
  }

  return json as T;
}

export const webApi = {
  /** Fetches the realtime session configuration built from the tenant's settings. */
  async getSessionConfig(input: {
    call_id: string;
    organization_id: string;
    caller_phone: string | null;
  }): Promise<SessionConfig> {
    return request<SessionConfig>('/api/internal/calls/session', input);
  },

  /** Appends a batch of transcript messages. Safe to retry. */
  async pushTranscript(input: {
    call_id: string;
    organization_id: string;
    messages: Array<{
      role: 'assistant' | 'user' | 'system' | 'tool';
      text: string;
      sequence: number;
      timestamp?: string;
    }>;
  }): Promise<void> {
    if (input.messages.length === 0) return;
    try {
      await request('/api/internal/calls/transcript', input, 10_000);
    } catch (err) {
      // A dropped transcript batch must not end a live call.
      log.warn('transcript push failed', {
        call_id: input.call_id,
        event: 'transcript.push_failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  /** Executes one tool call. Failures are returned to the model, never thrown at it. */
  async executeTool(input: {
    call_id: string;
    organization_id: string;
    tool: string;
    arguments: unknown;
  }): Promise<ToolOutcome> {
    try {
      return await request<ToolOutcome>('/api/internal/calls/tool', input, 25_000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error('tool execution failed', {
        call_id: input.call_id,
        event: `tool.${input.tool}.failed`,
        error: message,
      });
      return {
        result: {
          ok: false,
          error: message,
          message:
            'That did not go through. Tell the caller honestly that it failed and offer to take a message.',
        },
      };
    }
  },

  /** Finalises the call: duration, usage, summary. */
  async endCall(input: {
    call_id: string;
    organization_id: string;
    ended_at: string;
    result?: 'completed' | 'transferred' | 'failed' | 'abandoned' | 'rejected';
    error_message?: string | null;
    transfer_succeeded?: boolean | null;
  }): Promise<{ billable_minutes: number; billed_seconds: number } | null> {
    try {
      return await request('/api/internal/calls/end', input, 30_000);
    } catch (err) {
      // The scheduled maintenance sweep finalises calls the worker could not.
      log.error('call finalisation failed — will be recovered by maintenance sweep', {
        call_id: input.call_id,
        event: 'call.end_failed',
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  },
};
