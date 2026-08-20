/**
 * Reading Vapi's end-of-call report.
 *
 * Deliberately free of `server-only`, database access and I/O, because this is
 * the seam where a real call quietly turns into an empty record. If Vapi nests
 * the transcript somewhere this code does not look, ingestion still succeeds:
 * the webhook returns 200, a call row appears, and the transcript column is
 * null. Nothing anywhere reports a problem — the owner simply sees a call they
 * cannot read.
 *
 * So the shapes are pinned down by tests against real payload structures rather
 * than discovered one lost conversation at a time.
 */

/** The subset of Vapi's end-of-call report this product relies on. */
export interface VapiEndOfCallReport {
  callId: string;
  assistantId: string | null;
  phoneNumberId: string | null;
  customerNumber: string | null;
  businessNumber: string | null;
  startedAt: string | null;
  endedAt: string | null;
  endedReason: string | null;
  /** Flat transcript exactly as the provider rendered it. */
  transcript: string | null;
  summary: string | null;
  transcriptTurns: Array<{ role: 'assistant' | 'user' | 'system'; text: string; secondsFromStart?: number }>;
  structured: {
    customer_name?: string | null;
    customer_phone?: string | null;
    customer_email?: string | null;
    service_address?: string | null;
    postal_code?: string | null;
    service_requested?: string | null;
    urgency?: string | null;
    requested_appointment?: string | null;
    outcome?: string | null;
  } | null;
}

export interface VapiWebhookPayload {
  message?: {
    type?: string;
    endedReason?: string;
    summary?: string;
    startedAt?: string;
    endedAt?: string;
    transcript?: string;
    assistant?: { id?: string };
    analysis?: {
      summary?: string;
      structuredData?: Record<string, unknown>;
    };
    artifact?: {
      messages?: Array<{
        role?: string;
        message?: string;
        content?: string;
        secondsFromStart?: number;
      }>;
      transcript?: string;
    };
    call?: {
      id?: string;
      assistantId?: string;
      phoneNumberId?: string;
      assistant?: { id?: string };
      customer?: { number?: string };
      phoneNumber?: { number?: string };
      startedAt?: string;
      endedAt?: string;
    };
  };
}

export type VapiMessage = NonNullable<VapiWebhookPayload['message']>;

/**
 * The assistant id, wherever Vapi put it.
 *
 * This is the only trusted mapping from a call to a tenant, so failing to find
 * it means the call is attributed to nobody. Three known placements are checked
 * rather than one, and returning null is treated as a real outcome upstream.
 */
export function assistantIdFrom(message: VapiMessage): string | null {
  return message.call?.assistantId ?? message.assistant?.id ?? message.call?.assistant?.id ?? null;
}

/**
 * The system turns are Vapi's own scaffolding — the prompt it was given, not
 * anything a person said. They are kept, because a transcript that silently
 * omits part of what happened is worse than a verbose one, but they are
 * labelled distinctly when flattened.
 */
function normaliseRole(role: string | undefined): 'assistant' | 'user' | 'system' {
  if (role === 'bot' || role === 'assistant') return 'assistant';
  if (role === 'user' || role === 'customer' || role === 'human') return 'user';
  return 'system';
}

/** Normalises Vapi's payload into the shape the ingestion service expects. */
export function toReport(
  callId: string,
  assistantId: string,
  message: VapiMessage,
): VapiEndOfCallReport {
  const turns = (message.artifact?.messages ?? [])
    .map((m) => {
      const text = (m.message ?? m.content ?? '').trim();
      return text
        ? {
            role: normaliseRole(m.role),
            text,
            ...(typeof m.secondsFromStart === 'number' ? { secondsFromStart: m.secondsFromStart } : {}),
          }
        : null;
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  const structured = (message.analysis?.structuredData ?? null) as VapiEndOfCallReport['structured'];

  return {
    callId,
    assistantId,
    phoneNumberId: message.call?.phoneNumberId ?? null,
    customerNumber: message.call?.customer?.number ?? null,
    businessNumber: message.call?.phoneNumber?.number ?? null,
    startedAt: message.startedAt ?? message.call?.startedAt ?? null,
    endedAt: message.endedAt ?? message.call?.endedAt ?? null,
    endedReason: emptyToNull(message.endedReason),
    summary: emptyToNull(message.analysis?.summary) ?? emptyToNull(message.summary),
    // The provider's own flat rendering. Kept alongside the structured turns so
    // a call still has a readable record when the message array is missing.
    transcript: emptyToNull(message.transcript) ?? emptyToNull(message.artifact?.transcript),
    transcriptTurns: turns,
    structured,
  };
}

/**
 * An empty string is not a transcript, a summary, or a reason.
 *
 * Vapi sends `""` rather than omitting the field for a call where nobody spoke
 * — exactly what a failed-microphone call produces. An empty string satisfies
 * `??`, so it both stopped the fallback chain before the alternative was tried
 * and got stored as a value, turning "there is nothing here" into "here is
 * nothing". Both readings are wrong and neither shows up as an error.
 *
 * Applied to every optional text field the provider sends, not just the one
 * that was noticed first.
 */
function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * What actually happened on the call, for the `result` column.
 *
 * Vapi reports `status: completed` for a call that failed technically — its own
 * `endedReason` says the assistant never received any audio. Storing that as a
 * completed call puts a row on the owner's dashboard claiming a conversation
 * took place when nothing did. The provider's status describes its own
 * pipeline finishing; it is not a claim about the call being answered.
 */
export function callResultFor(input: {
  endedReason: string | null;
  transferred: boolean;
  hasContent: boolean;
}): 'transferred' | 'failed' | 'abandoned' | 'completed' {
  if (input.transferred) return 'transferred';

  const reason = (input.endedReason ?? '').toLowerCase();
  if (reason.includes('error') || reason.includes('failed')) return 'failed';

  // Nobody said anything and the line timed out. The call connected, so it is
  // not a failure — but calling it completed would be generous to the point of
  // being untrue.
  if (!input.hasContent && (reason.includes('silence') || reason.includes('timed-out'))) {
    return 'abandoned';
  }

  return 'completed';
}
