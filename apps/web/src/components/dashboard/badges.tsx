import { Flame, Snowflake, Thermometer } from 'lucide-react';
import { Badge } from '@/components/ui';

const SCORE_META = {
  hot: { tone: 'critical', label: 'Hot', Icon: Flame },
  warm: { tone: 'caution', label: 'Warm', Icon: Thermometer },
  cold: { tone: 'neutral', label: 'Cold', Icon: Snowflake },
} as const;

export function LeadScoreBadge({ score }: { score: 'hot' | 'warm' | 'cold' }) {
  const meta = SCORE_META[score] ?? SCORE_META.cold;
  const { Icon } = meta;
  return (
    <Badge tone={meta.tone}>
      <Icon className="size-3" aria-hidden />
      {meta.label}
    </Badge>
  );
}

const STATUS_META: Record<string, { tone: 'neutral' | 'brand' | 'positive' | 'caution' | 'critical'; label: string }> = {
  new: { tone: 'brand', label: 'New' },
  qualified: { tone: 'brand', label: 'Qualified' },
  appointment_booked: { tone: 'positive', label: 'Booked' },
  contacted: { tone: 'neutral', label: 'Contacted' },
  won: { tone: 'positive', label: 'Won' },
  lost: { tone: 'neutral', label: 'Lost' },
  scheduled: { tone: 'brand', label: 'Scheduled' },
  confirmed: { tone: 'positive', label: 'Confirmed' },
  completed: { tone: 'positive', label: 'Completed' },
  cancelled: { tone: 'neutral', label: 'Cancelled' },
  no_show: { tone: 'caution', label: 'No-show' },
  active: { tone: 'positive', label: 'Active' },
  trialing: { tone: 'brand', label: 'Trialing' },
  past_due: { tone: 'caution', label: 'Past due' },
  canceled: { tone: 'neutral', label: 'Cancelled' },
  unpaid: { tone: 'critical', label: 'Unpaid' },
  incomplete: { tone: 'caution', label: 'Not started' },
  paused: { tone: 'caution', label: 'Paused' },
  onboarding: { tone: 'brand', label: 'Onboarding' },
  suspended: { tone: 'critical', label: 'Suspended' },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { tone: 'neutral' as const, label: status.replace(/_/g, ' ') };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

const URGENCY_META: Record<string, { tone: 'neutral' | 'caution' | 'critical'; label: string }> = {
  emergency: { tone: 'critical', label: 'Emergency' },
  urgent: { tone: 'caution', label: 'Urgent' },
  soon: { tone: 'neutral', label: 'Soon' },
  flexible: { tone: 'neutral', label: 'Flexible' },
  unknown: { tone: 'neutral', label: 'Timing unknown' },
};

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const meta = URGENCY_META[urgency] ?? URGENCY_META.unknown!;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
