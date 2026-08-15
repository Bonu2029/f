'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarCheck, Check, MapPin, Phone, UserPlus } from 'lucide-react';
import { Badge, Button, cn } from '@/components/ui';

/**
 * A scripted illustration of a real call.
 *
 * It is explicitly labelled as an example conversation, and the button says
 * "Play example" rather than implying the visitor is dialling anything. The
 * script mirrors what the receptionist actually does — create a lead, check the
 * service area, check availability, book — so the illustration matches the
 * product rather than overselling it.
 */

type Turn =
  | { speaker: 'customer' | 'ai'; text: string }
  | { speaker: 'event'; text: string; icon: 'lead' | 'area' | 'booked' };

const SCRIPT: Turn[] = [
  { speaker: 'customer', text: 'Hi — my AC stopped working and the house is really hot.' },
  {
    speaker: 'ai',
    text: "I'm sorry, that's miserable in this weather. I can get someone out to you. What's the ZIP code for the property?",
  },
  { speaker: 'customer', text: "It's 19020, in Bensalem." },
  { speaker: 'event', text: 'Service area checked — 19020 is covered', icon: 'area' },
  {
    speaker: 'ai',
    text: "Good news, you're inside our service area. Can I get your name and the best number to reach you?",
  },
  { speaker: 'customer', text: 'John Smith, and this number is fine.' },
  { speaker: 'event', text: 'Lead created — John Smith, AC repair, Bensalem PA', icon: 'lead' },
  {
    speaker: 'ai',
    text: 'Thanks John. I have tomorrow at 1:00 PM or Thursday at 9:00 AM open for a diagnostic visit. Which works better?',
  },
  { speaker: 'customer', text: "Tomorrow at one works." },
  { speaker: 'event', text: 'Appointment booked — Aug 17, 1:00 PM', icon: 'booked' },
  {
    speaker: 'ai',
    text: "You're all set for tomorrow at 1:00 PM. I'll text you a confirmation now. Anything else I can help with?",
  },
];

const ICONS = {
  lead: UserPlus,
  area: MapPin,
  booked: CalendarCheck,
} as const;

export function CallDemo() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // The script advances on a timer. `playing` is only ever cleared from an
  // event handler or from the timeout callback, never synchronously during the
  // effect body, which would cause a cascading render.
  useEffect(() => {
    if (!playing || step >= SCRIPT.length) return;

    const current = SCRIPT[step]!;
    const delay = current.speaker === 'event' ? 700 : 1500;

    timer.current = setTimeout(() => {
      setStep((s) => {
        const next = s + 1;
        if (next >= SCRIPT.length) setPlaying(false);
        return next;
      });
    }, delay);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, step]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [step]);

  const visible = SCRIPT.slice(0, step);
  const finished = step >= SCRIPT.length;

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-lift">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-sunken px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="grid size-7 place-items-center rounded-full bg-brand-600 text-white">
            <Phone className="size-3.5" aria-hidden />
          </span>
          <div>
            <p className="font-medium leading-tight text-ink">Incoming call</p>
            <p className="text-xs text-ink-subtle">Example conversation</p>
          </div>
        </div>
        <Button
          size="sm"
          variant={finished ? 'secondary' : 'primary'}
          onClick={() => {
            if (finished) {
              setStep(0);
              setPlaying(true);
            } else {
              setPlaying((p) => !p);
            }
          }}
        >
          {finished ? 'Replay' : playing ? 'Pause' : step === 0 ? 'Play example' : 'Resume'}
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="h-[380px] space-y-3 overflow-y-auto px-4 py-4"
        aria-live="polite"
        aria-atomic="false"
      >
        {visible.length === 0 && (
          <p className="pt-24 text-center text-sm text-ink-subtle">
            Press play to watch how a call is handled from first hello to booked appointment.
          </p>
        )}

        {visible.map((turn, i) => {
          if (turn.speaker === 'event') {
            const Icon = ICONS[turn.icon];
            return (
              <div key={i} className="animate-in-up flex justify-center">
                <Badge tone="positive" className="gap-1.5 py-1">
                  <Icon className="size-3" aria-hidden />
                  {turn.text}
                </Badge>
              </div>
            );
          }
          const isAI = turn.speaker === 'ai';
          return (
            <div key={i} className={cn('animate-in-up flex', isAI ? 'justify-start' : 'justify-end')}>
              <div className={cn('max-w-[85%] space-y-1', isAI ? 'text-left' : 'text-right')}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  {isAI ? 'AI receptionist' : 'Customer'}
                </p>
                <p
                  className={cn(
                    'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    isAI ? 'bg-surface-sunken text-ink' : 'bg-brand-600 text-white',
                  )}
                >
                  {turn.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {finished && (
        <div className="grid grid-cols-3 divide-x divide-line border-t border-line bg-surface-sunken text-center">
          {[
            ['Lead captured', 'John Smith'],
            ['Service area', 'Confirmed'],
            ['Appointment', 'Aug 17, 1:00 PM'],
          ].map(([label, value]) => (
            <div key={label} className="px-2 py-3">
              <p className="flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                <Check className="size-3 text-positive" aria-hidden />
                {label}
              </p>
              <p className="mt-0.5 truncate text-xs font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
