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
    endedReason: message.endedReason ?? null,
    summary: message.analysis?.summary ?? message.summary ?? null,
    // The provider's own flat rendering. Kept alongside the structured turns so
    // a call still has a readable record when the message array is missing.
    transcript: emptyToNull(message.transcript) ?? emptyToNull(message.artifact?.transcript),
    transcriptTurns: turns,
    structured,
  };
}

/**
 * An empty string is not a transcript.
 *
 * Vapi sends `transcript: ""` for a call where nobody spoke — which is exactly
 * what a failed-microphone call produces. Passing that through as a value meant
 * the `??` chain stopped at it and the fallback rendering never ran; storing it
 * meant "we have a transcript and it says nothing" instead of "there is no
 * transcript". Both readings are wrong and neither is visible.
 */
function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}
