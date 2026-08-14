"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, Heart, MapPin, MessageSquare, Navigation, Phone, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { useFavorites } from "@/lib/hooks";
import { useActions, useMarketplace } from "@/lib/store";
import { haversineMiles } from "@/lib/geo";
import { formatDistance } from "@/lib/geo";

/** Distance is relative to the viewer, so it can only be resolved client-side. */
export function DistanceFromYou({ lat, lng }: { lat: number; lng: number }) {
  const { location } = useMarketplace();
  return (
    <span className="inline-flex items-center gap-1">
      <MapPin className="h-3.5 w-3.5" />
      {formatDistance(haversineMiles({ lat: location.lat, lng: location.lng }, { lat, lng }))} away
    </span>
  );
}

const REPORT_REASONS = [
  "Business doesn't exist at this address",
  "Prices or services are inaccurate",
  "Availability shown is never real",
  "Unprofessional or unsafe conduct",
  "Suspected fake reviews",
  "Something else",
];

export function ProfileActions({
  businessId,
  businessName,
  phone,
  address,
}: {
  businessId: string;
  businessName: string;
  phone: string;
  address: string;
}) {
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { session } = useMarketplace();
  const { createDispute, sendMessage } = useActions();
  const { toast } = useToast();
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [detail, setDetail] = useState("");

  const isFavorite = favoriteIds.has(businessId);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: businessName, url });
        return;
      } catch {
        /* user dismissed the share sheet */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Share it anywhere.", tone: "success" });
    } catch {
      toast({ title: "Couldn't copy the link", tone: "error" });
    }
  }

  function messageBusiness() {
    if (!session.userId) {
      toast({ title: "Sign in to message", description: "Messages are tied to your bookings.", tone: "info" });
      router.push("/auth/login");
      return;
    }
    const result = sendMessage({
      businessId,
      customerId: session.userId,
      body: `Hi! I had a question about booking at ${businessName}.`,
      role: "customer",
    });
    if (result.ok) router.push(`/messages/${result.id}`);
  }

  function submitReport() {
    createDispute({
      kind: "reported_business",
      businessId,
      customerId: session.userId,
      openedByRole: session.role === "business" ? "business" : "customer",
      reason,
      detail: detail.trim() || reason,
    });
    setReportOpen(false);
    setDetail("");
    toast({
      title: "Report submitted",
      description: "Our team reviews every report. Thanks for flagging it.",
      tone: "success",
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          icon={<Navigation className="h-4 w-4" />}
          onClick={() =>
            window.open(
              `https://maps.google.com/?q=${encodeURIComponent(`${businessName}, ${address}`)}`,
              "_blank",
              "noopener,noreferrer",
            )
          }
        >
          Directions
        </Button>
        <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>
          <Button variant="outline" size="sm" icon={<Phone className="h-4 w-4" />}>
            Call
          </Button>
        </a>
        <Button
          variant="outline"
          size="sm"
          icon={<MessageSquare className="h-4 w-4" />}
          onClick={messageBusiness}
        >
          Message
        </Button>
        <Button
          variant={isFavorite ? "secondary" : "outline"}
          size="sm"
          aria-pressed={isFavorite}
          icon={
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-urgent-500 text-urgent-500" : ""}`} />
          }
          onClick={() => {
            const result = toggleFavorite(businessId);
            if (!result.ok) toast({ title: result.reason ?? "Sign in first", tone: "info" });
          }}
        >
          {isFavorite ? "Saved" : "Save"}
        </Button>
        <Button variant="outline" size="sm" icon={<Share2 className="h-4 w-4" />} onClick={share}>
          Share
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Flag className="h-4 w-4" />}
          onClick={() => setReportOpen(true)}
        >
          Report
        </Button>
      </div>

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title={`Report ${businessName}`}
        description="Reports go to the NOW trust team. Nothing is shared with the business."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button variant="urgent" fullWidth onClick={submitReport}>
              Submit report
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="What's wrong?" htmlFor="report-reason">
            <Select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REPORT_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </Field>
          <Field label="Details" htmlFor="report-detail" hint="Optional, but it helps us act faster.">
            <Textarea
              id="report-detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Tell us what happened…"
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
