import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/format";
import { toDialable } from "@/lib/format";
import { updateRequestStatusAction } from "@/lib/data/request-actions";
import type { ServiceRequest, ServiceRequestStatus } from "@/lib/supabase/types";

const statusLabels: Record<
  ServiceRequestStatus,
  { text: string; tone: "accent" | "warn" | "positive" | "muted" }
> = {
  new: { text: "New", tone: "accent" },
  in_progress: { text: "In progress", tone: "warn" },
  scheduled: { text: "Scheduled", tone: "positive" },
  closed: { text: "Closed", tone: "muted" },
};

const nextStatus: Record<ServiceRequestStatus, ServiceRequestStatus | null> = {
  new: "in_progress",
  in_progress: "scheduled",
  scheduled: "closed",
  closed: null,
};

const nextLabel: Record<ServiceRequestStatus, string> = {
  new: "Mark in progress",
  in_progress: "Mark scheduled",
  scheduled: "Close request",
  closed: "",
};

export function RequestCard({
  request,
  tagCode,
  photoUrl,
}: {
  request: ServiceRequest;
  tagCode?: string;
  photoUrl?: string;
}) {
  const status = statusLabels[request.status];
  const phone = toDialable(request.contact_phone);
  const next = nextStatus[request.status];

  return (
    <li className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[1.0625rem] font-medium text-ink-950">
              {request.contact_name}
            </p>
            <Badge tone={status.tone}>{status.text}</Badge>
            {request.kind === "appointment" ? (
              <Badge tone="neutral">Appointment</Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-ink-500">
            {formatRelative(request.created_at)}
            {tagCode ? ` · Tag ${tagCode}` : ""}
          </p>
        </div>

        {phone ? (
          <a
            href={`tel:${phone}`}
            className="rounded-full border border-line-strong px-4 py-2 text-sm font-medium text-ink-950 transition-colors hover:bg-surface-muted"
          >
            {request.contact_phone}
          </a>
        ) : null}
      </div>

      <p className="mt-4 border-t border-line pt-4 text-[0.9375rem] leading-relaxed text-ink-900">
        {request.message}
      </p>

      {photoUrl ? (
        <a
          href={photoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent-600 underline underline-offset-4"
        >
          View attached photo
        </a>
      ) : null}

      {next ? (
        <form action={updateRequestStatusAction} className="mt-4">
          <input type="hidden" name="id" value={request.id} />
          <input type="hidden" name="status" value={next} />
          <button
            type="submit"
            className="rounded-full border border-line-strong px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-surface-muted hover:text-ink-950"
          >
            {nextLabel[request.status]}
          </button>
        </form>
      ) : null}
    </li>
  );
}
