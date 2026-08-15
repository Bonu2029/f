'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Check, Send } from 'lucide-react';
import { TRAINING_QUESTIONS } from '@afd/shared';
import { Alert, Badge, Button, Card, CardContent, Input, cn } from '@/components/ui';

interface Change {
  kind: string;
  label: string;
  action: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  changes: Change[];
}

interface CoverageItem {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

/**
 * ChatGPT-style training conversation.
 *
 * Everything the assistant extracts is shown as an explicit list of changes
 * under its reply, and the sidebar reflects real database state. Nothing is
 * saved invisibly, and every extracted record stays editable in Knowledge.
 */
export function TrainingChat({
  businessName,
  initialMessages,
  coverage,
}: {
  businessName: string;
  initialMessages: Message[];
  coverage: CoverageItem[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [coverageState, setCoverageState] = useState(coverage);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Monotonic counter for optimistic message keys — deterministic, so nothing
  // impure is called while React is rendering.
  const optimisticSeq = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const askedCount = messages.filter((m) => m.role === 'assistant').length;
  const nextPrompt = TRAINING_QUESTIONS[askedCount];

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setError(null);
    setSending(true);
    setInput('');
    optimisticSeq.current += 1;
    const optimisticId = `local-${optimisticSeq.current}`;
    setMessages((m) => [...m, { id: optimisticId, role: 'user', content: trimmed, changes: [] }]);

    try {
      const res = await fetch('/api/onboarding/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error?.message ?? 'Your receptionist could not reply just now.');
        // Give the owner their text back rather than losing it.
        setMessages((m) => m.filter((msg) => msg.id !== optimisticId));
        setInput(trimmed);
        return;
      }

      setDemo(Boolean(json.demo));
      optimisticSeq.current += 1;
      setMessages((m) => [
        ...m,
        {
          id: `assistant-${optimisticSeq.current}`,
          role: 'assistant',
          content: json.reply as string,
          changes: (json.changes ?? []) as Change[],
        },
      ]);

      // Refresh the coverage panel from the server so it reflects real state.
      void refreshCoverage();
    } catch {
      setError('We could not reach the training assistant. Your message was not lost — try again.');
      setMessages((m) => m.filter((msg) => msg.id !== optimisticId));
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  }

  async function refreshCoverage() {
    try {
      const res = await fetch('/api/onboarding/coverage');
      if (!res.ok) return;
      const json = await res.json();
      setCoverageState(json.coverage as CoverageItem[]);
    } catch {
      /* the panel simply stays as it was */
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <Card className="flex h-[560px] flex-col">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="rounded-lg bg-surface-sunken p-4">
              <p className="text-sm text-ink">
                Hi! I&rsquo;m going to be answering the phone for {businessName}. Tell me what
                services you offer and roughly what they cost, and I&rsquo;ll take it from there.
              </p>
              <p className="mt-2 text-xs text-ink-subtle">
                Type naturally — full sentences, or just a list. I&rsquo;ll ask follow-up questions.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[85%]', m.role === 'user' && 'text-right')}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  {m.role === 'user' ? 'You' : 'Training assistant'}
                </p>
                <p
                  className={cn(
                    'mt-1 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-ink',
                  )}
                >
                  {m.content}
                </p>

                {m.changes.length > 0 && (
                  <div className="mt-2 space-y-1 text-left">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                      Saved to your knowledge base
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {m.changes.map((c, i) => (
                        <li key={i}>
                          <Badge tone={c.action === 'skipped' ? 'neutral' : 'positive'}>
                            {c.action === 'skipped' ? 'already had' : c.action}: {c.label}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-surface-sunken px-3.5 py-2.5">
                <span className="flex gap-1" aria-label="Assistant is typing">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="size-1.5 animate-bounce rounded-full bg-ink-faint"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-line p-4">
          {error && <Alert tone="critical" title={error} className="mb-3" />}
          {demo && (
            <p className="mb-2 text-xs text-caution">
              Demo mode: replies come from a simple local extractor, not a language model.
            </p>
          )}

          {nextPrompt && messages.length > 0 && (
            <button
              type="button"
              className="mb-2 text-xs text-ink-subtle hover:text-ink"
              onClick={() => setInput(nextPrompt)}
            >
              Suggested next topic: {nextPrompt}
            </button>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="We do AC repair for $149, furnace tune-ups for $99…"
              aria-label="Message the training assistant"
              disabled={sending}
            />
            <Button type="submit" loading={sending} disabled={!input.trim()}>
              <Send aria-hidden />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="pt-5">
            <h2 className="text-sm font-semibold text-ink">What your AI has learned</h2>
            <ul className="mt-3 space-y-2">
              {coverageState.map((item) => (
                <li key={item.key} className="flex items-start gap-2 text-sm">
                  {item.ok ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden />
                  )}
                  <span className="min-w-0">
                    <span className="block font-medium text-ink">{item.label}</span>
                    <span className="block text-xs text-ink-subtle">{item.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ink-subtle">
              Everything here is editable in{' '}
              <Link href="/dashboard/knowledge" className="font-medium text-brand-600 hover:underline">
                Knowledge
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <Button asChild className="w-full">
          <Link href="/onboarding/voice">
            Next: choose a voice <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
