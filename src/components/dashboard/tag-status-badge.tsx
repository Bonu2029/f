import { Badge } from "@/components/ui/badge";
import type { TagStatus } from "@/lib/supabase/types";

const labels: Record<TagStatus, { text: string; tone: "positive" | "muted" | "warn" }> =
  {
    active: { text: "Active", tone: "positive" },
    unassigned: { text: "Unassigned", tone: "muted" },
    inactive: { text: "Inactive", tone: "warn" },
  };

export function TagStatusBadge({ status }: { status: TagStatus }) {
  const { text, tone } = labels[status];
  return <Badge tone={tone}>{text}</Badge>;
}
