'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input, cn } from '@/components/ui';

/**
 * Searchable transcript. Filtering happens client-side over an already-loaded
 * conversation, which is bounded by the length of a phone call.
 */
export function TranscriptViewer({
  messages,
  timezone,
}: {
  messages: Array<{ id: string; role: string; text: string; timestamp: string }>;
  timezone: string;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => m.text.toLowerCase().includes(q));
  }, [messages, query]);

  if (messages.length === 0) {
    return (
      <p className="text-sm text-ink-subtle">
        No transcript was captured for this call.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search this transcript"
          aria-label="Search transcript"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-subtle">Nothing in this call matches “{query}”.</p>
      ) : (
        <ol className="space-y-4">
          {filtered.map((m) => {
            const isSystem = m.role === 'system' || m.role === 'tool';
            if (isSystem) {
              return (
                <li key={m.id} className="text-center">
                  <span className="inline-block rounded-full border border-line bg-surface-sunken px-3 py-1 text-xs text-ink-subtle">
                    {m.text}
                  </span>
                </li>
              );
            }
            const isAI = m.role === 'assistant';
            return (
              <li key={m.id}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  {isAI ? 'AI receptionist' : 'Customer'}
                  <span className="ml-2 font-normal normal-case tracking-normal">
                    {new Date(m.timestamp).toLocaleTimeString(undefined, {
                      timeZone: timezone,
                      hour: 'numeric',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </p>
                <p
                  className={cn(
                    'mt-1 rounded-lg px-3 py-2 text-sm leading-relaxed',
                    isAI ? 'bg-surface-sunken text-ink' : 'border border-line text-ink',
                  )}
                >
                  {highlight(m.text, query)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function highlight(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const parts = text.split(new RegExp(`(${escapeRegex(q)})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="rounded bg-brand-100 px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
