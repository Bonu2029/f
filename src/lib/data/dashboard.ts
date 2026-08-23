import "server-only";
import { createClientOrNull } from "@/lib/supabase/server";
import type { Session } from "@/lib/session";
import type {
  Customer,
  ServiceRequest,
  TagEvent,
  TagWithInstallation,
} from "@/lib/supabase/types";
import {
  demoCustomers,
  demoEvents,
  demoRequests,
  demoTags,
} from "@/lib/demo/data";

const TAG_SELECT = `
  id, business_id, code, installation_id, status, activated_at,
  last_tapped_at, tap_count, created_at,
  installations (
    id, product_name, installed_on, warranty_expires_on,
    customers ( id, name )
  )
`;

export type ActivityItem = {
  id: string;
  kind: "tap" | "request" | "activated";
  title: string;
  detail: string;
  at: string;
};

export type Overview = {
  activeTags: number;
  tagTaps: number;
  serviceRequests: number;
  customersReturned: number;
  activity: ActivityItem[];
};

export async function getTags(
  session: Session,
): Promise<TagWithInstallation[]> {
  if (session.mode === "demo") return demoTags;

  const supabase = await createClientOrNull();
  if (!supabase) return [];

  const { data } = await supabase
    .from("tags")
    .select(TAG_SELECT)
    .eq("business_id", session.businessId)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as TagWithInstallation[];
}

export async function getCustomers(session: Session): Promise<Customer[]> {
  if (session.mode === "demo") return demoCustomers;

  const supabase = await createClientOrNull();
  if (!supabase) return [];

  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", session.businessId)
    .order("created_at", { ascending: false });

  return (data ?? []) as Customer[];
}

export async function getServiceRequests(
  session: Session,
): Promise<ServiceRequest[]> {
  if (session.mode === "demo") return demoRequests;

  const supabase = await createClientOrNull();
  if (!supabase) return [];

  const { data } = await supabase
    .from("service_requests")
    .select("*")
    .eq("business_id", session.businessId)
    .order("created_at", { ascending: false })
    .limit(200);

  return (data ?? []) as ServiceRequest[];
}

/**
 * Turns stored photo object paths into short-lived signed URLs. Storage RLS
 * only lets a business sign photos its own requests reference.
 */
export async function getRequestPhotoUrls(
  session: Session,
  requests: ServiceRequest[],
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  const withPhotos = requests.filter((request) => request.photo_url);

  if (session.mode === "demo" || withPhotos.length === 0) return urls;

  const supabase = await createClientOrNull();
  if (!supabase) return urls;

  const { data } = await supabase.storage
    .from("request-photos")
    .createSignedUrls(
      withPhotos.map((request) => request.photo_url as string),
      600,
    );

  for (const entry of data ?? []) {
    if (entry.signedUrl && entry.path) urls.set(entry.path, entry.signedUrl);
  }

  return urls;
}

export async function getOverview(session: Session): Promise<Overview> {
  const [tags, requests, events] = await Promise.all([
    getTags(session),
    getServiceRequests(session),
    getRecentEvents(session),
  ]);

  const activeTags = tags.filter((tag) => tag.status === "active").length;
  const tagTaps = tags.reduce((total, tag) => total + tag.tap_count, 0);

  // A "returned" customer is one whose tag has been tapped at least once.
  const customersReturned = new Set(
    tags
      .filter((tag) => tag.tap_count > 0)
      .map((tag) => tag.installations?.customers?.id ?? tag.id),
  ).size;

  const codeById = new Map(tags.map((tag) => [tag.id, tag.code]));

  const activity: ActivityItem[] = [
    ...events.map((event) => ({
      id: `event-${event.id}`,
      kind: "tap" as const,
      title: `${labelFor(codeById.get(event.tag_id), tags)} tapped`,
      detail: event.kind === "qr_scan" ? "QR scan" : "NFC tap",
      at: event.created_at,
    })),
    ...requests.map((request) => ({
      id: `request-${request.id}`,
      kind: "request" as const,
      title:
        request.kind === "appointment"
          ? "Appointment request received"
          : "Service request received",
      detail: request.contact_name,
      at: request.created_at,
    })),
    ...tags
      .filter((tag) => tag.activated_at)
      .map((tag) => ({
        id: `activated-${tag.id}`,
        kind: "activated" as const,
        title: "New tag activated",
        detail: `${tag.code} · ${tag.installations?.product_name ?? "Unassigned"}`,
        at: tag.activated_at as string,
      })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return {
    activeTags,
    tagTaps,
    serviceRequests: requests.length,
    customersReturned,
    activity,
  };
}

async function getRecentEvents(session: Session): Promise<TagEvent[]> {
  if (session.mode === "demo") return demoEvents;

  const supabase = await createClientOrNull();
  if (!supabase) return [];

  const { data } = await supabase
    .from("tag_events")
    .select("id, tag_id, business_id, kind, created_at")
    .eq("business_id", session.businessId)
    .order("created_at", { ascending: false })
    .limit(10);

  return (data ?? []) as TagEvent[];
}

function labelFor(
  code: string | undefined,
  tags: TagWithInstallation[],
): string {
  const tag = tags.find((candidate) => candidate.code === code);
  return tag?.installations?.product_name
    ? `${tag.installations.product_name} Tag`
    : `Tag ${code ?? ""}`.trim();
}
