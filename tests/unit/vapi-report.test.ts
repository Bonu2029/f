import { describe, expect, it } from 'vitest';
import { assistantIdFrom, callResultFor, toReport, type VapiMessage } from '@/server/vapi-report';

/**
 * Reading the end-of-call report.
 *
 * This is the seam where a real conversation quietly becomes an empty record.
 * Every field below is read out of a nested optional structure, so getting one
 * wrong does not throw and does not fail the webhook — the call is stored with
 * a null transcript, or attributed to nobody, and the only symptom is an owner
 * looking at a call they cannot read.
 *
 * The payloads here follow the structure Vapi actually posts, including the
 * shapes that show up when something went wrong on the call.
 */

/** A report from a call that went well. */
const completed: VapiMessage = {
  type: 'end-of-call-report',
  startedAt: '2026-08-20T21:55:48.000Z',
  endedAt: '2026-08-20T21:58:12.000Z',
  endedReason: 'customer-ended-call',
  artifact: {
    transcript: 'AI: Thanks for calling.\nUser: My kitchen drain is blocked.',
    messages: [
      { role: 'system', message: 'You are a receptionist.', secondsFromStart: 0 },
      { role: 'bot', message: 'Thanks for calling Yardley Plumbing.', secondsFromStart: 0.4 },
      { role: 'user', message: 'My kitchen drain is blocked.', secondsFromStart: 4.2 },
    ],
  },
  analysis: {
    summary: 'Caller reported a blocked kitchen drain and asked for a visit.',
    structuredData: {
      customer_name: 'Dana Whitfield',
      customer_phone: '2155550188',
      service_requested: 'Blocked kitchen drain',
      urgency: 'urgent',
      outcome: 'lead_captured',
    },
  },
  call: {
    id: '01a0212c-52a0-7aa3-9572-10df53c1e6c0',
    assistantId: '8be3ccf2-f5ca-456f-92a7-febf676b4cee',
    phoneNumberId: 'pn_abc',
    customer: { number: '+12155550188' },
    phoneNumber: { number: '+12155550142' },
  },
};

describe('assistantIdFrom', () => {
  it('reads the id from the call, where a phone call puts it', () => {
    expect(assistantIdFrom(completed)).toBe('8be3ccf2-f5ca-456f-92a7-febf676b4cee');
  });

  it('falls back to the assistant object', () => {
    expect(assistantIdFrom({ assistant: { id: 'asst_2' }, call: { id: 'c' } })).toBe('asst_2');
  });

  it('falls back to the assistant nested in the call', () => {
    expect(assistantIdFrom({ call: { id: 'c', assistant: { id: 'asst_3' } } })).toBe('asst_3');
  });

  it('returns null rather than guessing, so the call is not misattributed', () => {
    // Attributing a call to the wrong tenant would put one business's customer
    // in another business's dashboard. Null is handled upstream as "unknown".
    expect(assistantIdFrom({ call: { id: 'c' } })).toBeNull();
    expect(assistantIdFrom({})).toBeNull();
  });
});

describe('toReport', () => {
  const report = toReport('call_1', 'asst_1', completed);

  it('keeps the provider transcript', () => {
    expect(report.transcript).toBe('AI: Thanks for calling.\nUser: My kitchen drain is blocked.');
  });

  it('keeps every turn, and maps Vapi roles to ours', () => {
    expect(report.transcriptTurns.map((t) => t.role)).toEqual(['system', 'assistant', 'user']);
    expect(report.transcriptTurns[2]).toEqual({
      role: 'user',
      text: 'My kitchen drain is blocked.',
      secondsFromStart: 4.2,
    });
  });

  it('reads the analysis rather than the bare summary field', () => {
    expect(report.summary).toBe('Caller reported a blocked kitchen drain and asked for a visit.');
    expect(report.structured?.customer_name).toBe('Dana Whitfield');
    expect(report.structured?.outcome).toBe('lead_captured');
  });

  it('takes both phone numbers from where Vapi nests them', () => {
    expect(report.customerNumber).toBe('+12155550188');
    expect(report.businessNumber).toBe('+12155550142');
    expect(report.phoneNumberId).toBe('pn_abc');
  });

  it('uses the provider timestamps, never our own clock', () => {
    expect(report.startedAt).toBe('2026-08-20T21:55:48.000Z');
    expect(report.endedAt).toBe('2026-08-20T21:58:12.000Z');
  });

  it('falls back to the timestamps on the call object', () => {
    const nested = toReport('call_2', 'asst_1', {
      call: { id: 'c', startedAt: '2026-08-20T10:00:00.000Z', endedAt: '2026-08-20T10:01:00.000Z' },
    });
    expect(nested.startedAt).toBe('2026-08-20T10:00:00.000Z');
    expect(nested.endedAt).toBe('2026-08-20T10:01:00.000Z');
  });

  it('reads content when a turn uses that field instead of message', () => {
    const alt = toReport('call_3', 'asst_1', {
      artifact: { messages: [{ role: 'user', content: 'Are you open Saturday?' }] },
    });
    expect(alt.transcriptTurns[0]?.text).toBe('Are you open Saturday?');
  });

  it('drops turns with no text rather than storing blanks', () => {
    const blanks = toReport('call_4', 'asst_1', {
      artifact: { messages: [{ role: 'user', message: '   ' }, { role: 'bot', message: 'Hello?' }] },
    });
    expect(blanks.transcriptTurns).toHaveLength(1);
  });

  /**
   * The case every failed test call in this project produced. Vapi ends with
   * `error-assistant-did-not-receive-customer-audio` and sends `transcript: ""`.
   * An empty string is truthy enough to win a `??`, so it both suppressed the
   * fallback rendering and got stored as though it were a transcript.
   */
  it('treats an empty transcript as absent, not as an empty transcript', () => {
    const silent = toReport('call_5', 'asst_1', {
      type: 'end-of-call-report',
      endedReason: 'call.in-progress.error-assistant-did-not-receive-customer-audio',
      transcript: '',
      artifact: { transcript: '', messages: [] },
      analysis: { summary: undefined },
      call: { id: 'call_5' },
    });
    expect(silent.transcript).toBeNull();
    expect(silent.summary).toBeNull();
    expect(silent.transcriptTurns).toEqual([]);
    expect(silent.endedReason).toBe(
      'call.in-progress.error-assistant-did-not-receive-customer-audio',
    );
  });

  it('uses the artifact transcript when the top-level one is missing', () => {
    const only = toReport('call_6', 'asst_1', {
      artifact: { transcript: 'AI: Hello.' },
    });
    expect(only.transcript).toBe('AI: Hello.');
  });

  it('survives a report with nothing in it at all', () => {
    // Never throw here: a throw inside the webhook becomes a 500, and Vapi
    // retries it forever.
    const empty = toReport('call_7', 'asst_1', {});
    expect(empty.callId).toBe('call_7');
    expect(empty.transcript).toBeNull();
    expect(empty.structured).toBeNull();
    expect(empty.transcriptTurns).toEqual([]);
    expect(empty.startedAt).toBeNull();
  });

  /**
   * The summary had exactly the same defect as the transcript, and only the
   * transcript was fixed first. Real rows in the database proved it: six calls
   * stored `summary = ''` rather than null.
   */
  it('treats an empty summary as absent too', () => {
    const blank = toReport('call_8', 'asst_1', {
      transcript: '',
      analysis: { summary: '   ', structuredData: {} },
      summary: '',
      endedReason: '',
    });
    expect(blank.summary).toBeNull();
    expect(blank.transcript).toBeNull();
    expect(blank.endedReason).toBeNull();
  });

  it('falls back to the top-level summary when the analysis one is blank', () => {
    const fallback = toReport('call_9', 'asst_1', {
      analysis: { summary: '' },
      summary: 'Caller asked about pricing.',
    });
    expect(fallback.summary).toBe('Caller asked about pricing.');
  });
});

/**
 * Vapi reports `status: completed` for a call its own endedReason says never
 * received any audio. Storing that as completed puts a row on the dashboard
 * claiming a conversation happened when nothing did.
 */
describe('callResultFor', () => {
  const base = { transferred: false, hasContent: true };

  it('calls a real conversation completed', () => {
    expect(callResultFor({ ...base, endedReason: 'customer-ended-call' })).toBe('completed');
    expect(callResultFor({ ...base, endedReason: 'assistant-ended-call' })).toBe('completed');
  });

  it('calls a technical failure a failure, whatever the provider status says', () => {
    expect(
      callResultFor({
        ...base,
        hasContent: false,
        endedReason: 'call.in-progress.error-assistant-did-not-receive-customer-audio',
      }),
    ).toBe('failed');
    expect(callResultFor({ ...base, endedReason: 'pipeline-error-openai-llm-failed' })).toBe('failed');
  });

  it('calls a silent line abandoned rather than completed', () => {
    expect(callResultFor({ ...base, hasContent: false, endedReason: 'silence-timed-out' })).toBe(
      'abandoned',
    );
  });

  it('does not call a real conversation abandoned just because it ended in silence', () => {
    // Someone talked, then stopped. That call happened and has a transcript.
    expect(callResultFor({ ...base, hasContent: true, endedReason: 'silence-timed-out' })).toBe(
      'completed',
    );
  });

  it('reports a transfer as a transfer, ahead of everything else', () => {
    expect(callResultFor({ ...base, transferred: true, endedReason: 'silence-timed-out' })).toBe(
      'transferred',
    );
  });

  it('defaults to completed when there is no reason at all', () => {
    expect(callResultFor({ ...base, endedReason: null })).toBe('completed');
  });
});
