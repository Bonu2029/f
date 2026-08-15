import WebSocket from 'ws';
import { REALTIME_BASE, REALTIME_REST, config } from './config.js';
import { log } from './logger.js';
import { webApi, type SessionConfig } from './web-api.js';

/**
 * One live phone call.
 *
 * Lifecycle:
 *   1. Fetch the tenant's session configuration from the web app.
 *   2. Accept the SIP call with OpenAI (model, voice, instructions, tools).
 *   3. Open a WebSocket to the call's realtime session and monitor events.
 *   4. Execute tool calls through the web app, returning results to the model.
 *   5. Handle transfer / hangup side effects.
 *   6. On close, finalise the call so usage and the summary are recorded.
 *
 * Everything here is defensive: a failure at any step ends the call cleanly and
 * still records what happened, because silently dropping a customer's call is
 * the worst outcome this product can produce.
 */

export interface CallSessionInput {
  openaiCallId: string;
  callId: string;
  organizationId: string;
  callerPhone: string | null;
  businessPhone: string | null;
}

interface PendingTranscript {
  role: 'assistant' | 'user' | 'system' | 'tool';
  text: string;
  sequence: number;
  timestamp: string;
}

export class CallSession {
  private ws: WebSocket | null = null;
  private sequence = 0;
  private pending: PendingTranscript[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private maxTimer: ReturnType<typeof setTimeout> | null = null;
  private finished = false;
  private transferSucceeded: boolean | null = null;
  private endResult: 'completed' | 'transferred' | 'failed' | 'abandoned' = 'completed';
  private errorMessage: string | null = null;
  private sessionConfig: SessionConfig | null = null;

  constructor(
    private readonly input: CallSessionInput,
    private readonly onFinished: (callId: string) => void,
  ) {}

  private get logContext() {
    return {
      call_id: this.input.callId,
      organization_id: this.input.organizationId,
      openai_call_id: this.input.openaiCallId,
    };
  }

  /** Accepts the inbound SIP call and starts the realtime session. */
  async start(): Promise<void> {
    try {
      this.sessionConfig = await webApi.getSessionConfig({
        call_id: this.input.callId,
        organization_id: this.input.organizationId,
        caller_phone: this.input.callerPhone,
      });
    } catch (err) {
      this.errorMessage = `Session configuration failed: ${err instanceof Error ? err.message : String(err)}`;
      this.endResult = 'failed';
      log.error('could not load session configuration', { ...this.logContext, error: this.errorMessage });
      await this.finalise();
      throw err;
    }

    await this.acceptCall(this.sessionConfig);
    this.connectWebSocket();

    this.flushTimer = setInterval(() => void this.flushTranscript(), config.transcriptFlushMs);
    this.maxTimer = setTimeout(() => {
      log.warn('call hit the maximum duration ceiling', this.logContext);
      void this.hangup('completed');
    }, config.maxCallSeconds * 1000);
    this.resetIdleTimer();
  }

  /**
   * Tells OpenAI to answer the SIP call with this tenant's configuration.
   * Until this succeeds the caller hears ringing, so failures must be fast.
   */
  private async acceptCall(session: SessionConfig): Promise<void> {
    const res = await fetch(`${REALTIME_REST}/calls/${encodeURIComponent(this.input.openaiCallId)}/accept`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'realtime',
        model: session.model,
        instructions: session.instructions,
        audio: {
          input: {
            transcription: { model: 'whisper-1' },
            turn_detection: { type: 'semantic_vad' },
          },
          output: { voice: session.voice },
        },
        tools: session.tools,
        tool_choice: 'auto',
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const detail = await res.text();
      this.errorMessage = `OpenAI refused the call: ${res.status} ${detail.slice(0, 200)}`;
      this.endResult = 'failed';
      log.error('call accept failed', { ...this.logContext, status: res.status });
      await this.finalise();
      throw new Error(this.errorMessage);
    }

    log.info('call accepted', { ...this.logContext, voice: session.voice, model: session.model });
  }

  /** Opens the monitoring socket for the accepted call. */
  private connectWebSocket(): void {
    const url = `${REALTIME_BASE}?call_id=${encodeURIComponent(this.input.openaiCallId)}`;
    const ws = new WebSocket(url, {
      headers: { Authorization: `Bearer ${config.openaiApiKey}` },
    });
    this.ws = ws;

    ws.on('open', () => {
      log.info('realtime socket open', this.logContext);
      // Greet first so the caller is not met with silence.
      this.send({ type: 'response.create' });
    });

    ws.on('message', (raw) => {
      void this.handleEvent(raw.toString());
    });

    ws.on('error', (err) => {
      log.error('realtime socket error', { ...this.logContext, error: err.message });
      this.errorMessage = this.errorMessage ?? `Realtime socket error: ${err.message}`;
    });

    ws.on('close', (code) => {
      log.info('realtime socket closed', { ...this.logContext, code });
      void this.finalise();
    });
  }

  private send(payload: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      log.info('call idle, ending', this.logContext);
      this.endResult = 'abandoned';
      void this.hangup('abandoned');
    }, config.idleTimeoutSeconds * 1000);
  }

  private queueTranscript(role: PendingTranscript['role'], text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.sequence += 1;
    this.pending.push({
      role,
      text: trimmed.slice(0, 8000),
      sequence: this.sequence,
      timestamp: new Date().toISOString(),
    });
    if (this.pending.length >= 20) void this.flushTranscript();
  }

  private async flushTranscript(): Promise<void> {
    if (this.pending.length === 0) return;
    const batch = this.pending.splice(0, this.pending.length);
    await webApi.pushTranscript({
      call_id: this.input.callId,
      organization_id: this.input.organizationId,
      messages: batch,
    });
  }

  /** Routes one realtime server event. */
  private async handleEvent(raw: string): Promise<void> {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }

    const type = String(event.type ?? '');

    switch (type) {
      // Caller speech.
      case 'conversation.item.input_audio_transcription.completed': {
        const text = String(event.transcript ?? '');
        this.queueTranscript('user', text);
        this.resetIdleTimer();
        break;
      }

      // Receptionist speech.
      case 'response.output_audio_transcript.done': {
        this.queueTranscript('assistant', String(event.transcript ?? ''));
        this.resetIdleTimer();
        break;
      }

      // Tool call.
      case 'response.function_call_arguments.done': {
        await this.runTool({
          name: String(event.name ?? ''),
          callId: String(event.call_id ?? ''),
          argumentsJson: String(event.arguments ?? '{}'),
        });
        break;
      }

      case 'error': {
        const detail = (event.error as { message?: string } | undefined)?.message ?? 'unknown';
        log.error('realtime error event', { ...this.logContext, detail });
        this.errorMessage = this.errorMessage ?? `Realtime error: ${detail}`;
        break;
      }

      case 'response.done':
        this.resetIdleTimer();
        break;

      default:
        log.debug('unhandled realtime event', { ...this.logContext, type });
    }
  }

  /**
   * Executes a tool via the web app and returns the result to the model.
   * The model always receives a result — a failure is reported honestly rather
   * than left hanging, so it can tell the caller the truth.
   */
  private async runTool(input: { name: string; callId: string; argumentsJson: string }): Promise<void> {
    let args: unknown = {};
    try {
      args = JSON.parse(input.argumentsJson);
    } catch {
      args = {};
    }

    log.info('tool invoked', { ...this.logContext, event: `tool.${input.name}` });
    this.queueTranscript('tool', `Used tool: ${input.name}`);

    const outcome = await webApi.executeTool({
      call_id: this.input.callId,
      organization_id: this.input.organizationId,
      tool: input.name,
      arguments: args,
    });

    // Hand the result back to the model and let it respond.
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: input.callId,
        output: JSON.stringify(outcome.result),
      },
    });
    this.send({ type: 'response.create' });

    const effect = outcome.side_effect;
    if (effect?.type === 'transfer') {
      // Let the model finish its "connecting you now" line before referring.
      const destination = effect.destination;
      setTimeout(() => void this.transfer(destination), 2500);
    } else if (effect?.type === 'hangup') {
      setTimeout(() => void this.hangup('completed'), 3000);
    }
  }

  /**
   * Transfers the caller using the Realtime SIP refer endpoint.
   * A failed transfer is reported back to the model so it can offer to take a
   * message instead of pretending the handover worked.
   */
  private async transfer(destination: string): Promise<void> {
    try {
      const res = await fetch(`${REALTIME_REST}/calls/${encodeURIComponent(this.input.openaiCallId)}/refer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ target_uri: `tel:${destination}` }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) throw new Error(`refer returned ${res.status}`);

      this.transferSucceeded = true;
      this.endResult = 'transferred';
      log.info('call transferred', { ...this.logContext });
    } catch (err) {
      this.transferSucceeded = false;
      log.error('transfer failed', {
        ...this.logContext,
        error: err instanceof Error ? err.message : String(err),
      });
      this.queueTranscript('system', 'Transfer attempted but did not connect.');

      // Tell the model the truth so it can recover with the caller.
      this.send({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'The transfer did NOT connect. Apologise to the caller, tell them you could not reach anyone, and offer to take a detailed message instead. Do not claim the transfer worked.',
            },
          ],
        },
      });
      this.send({ type: 'response.create' });
    }
  }

  /** Ends the call gracefully. */
  async hangup(result: 'completed' | 'abandoned' = 'completed'): Promise<void> {
    this.endResult = this.endResult === 'transferred' ? 'transferred' : result;
    try {
      await fetch(`${REALTIME_REST}/calls/${encodeURIComponent(this.input.openaiCallId)}/hangup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.openaiApiKey}` },
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      log.warn('hangup request failed', {
        ...this.logContext,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    this.ws?.close();
    await this.finalise();
  }

  /** Records the outcome exactly once. */
  private async finalise(): Promise<void> {
    if (this.finished) return;
    this.finished = true;

    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.maxTimer) clearTimeout(this.maxTimer);

    await this.flushTranscript();

    const usage = await webApi.endCall({
      call_id: this.input.callId,
      organization_id: this.input.organizationId,
      ended_at: new Date().toISOString(),
      result: this.endResult,
      error_message: this.errorMessage,
      transfer_succeeded: this.transferSucceeded,
    });

    log.info('call finished', {
      ...this.logContext,
      result: this.endResult,
      billable_minutes: usage?.billable_minutes ?? null,
    });

    this.onFinished(this.input.callId);
  }
}
