"use client";

import { useState } from "react";
import { Check, Crosshair, MapPin, Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { useMarketplace } from "@/lib/store";
import { CITIES } from "@/lib/data/cities";
import { cn } from "@/lib/utils";

/**
 * Location picker. Permission is requested, never required — a denied prompt
 * falls straight through to manual entry, and the app keeps working.
 */
export function LocationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { location, setLocation, requestDeviceLocation } = useMarketplace();
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const philly = CITIES[0];

  async function useDevice() {
    setBusy(true);
    setError(null);
    const result = await requestDeviceLocation();
    setBusy(false);
    if (result.ok) onClose();
    else setError(result.message ?? "We couldn't get your location.");
  }

  function chooseNeighborhood(name: string) {
    // Neighbourhood centroids come from the city record; a real build would
    // hit a geocoder here.
    const offsets: Record<string, [number, number]> = {
      Rittenhouse: [39.9496, -75.1725],
      "Center City": [39.9526, -75.1652],
      "Old City": [39.95, -75.144],
      "Northern Liberties": [39.964, -75.142],
      Fishtown: [39.97, -75.13],
      "Queen Village": [39.938, -75.149],
      "Bella Vista": [39.939, -75.158],
      "East Passyunk": [39.928, -75.162],
      "Graduate Hospital": [39.943, -75.178],
      Fairmount: [39.967, -75.172],
      "University City": [39.952, -75.193],
      "Point Breeze": [39.933, -75.178],
      Manayunk: [40.025, -75.223],
    };
    const [lat, lng] = offsets[name] ?? [philly.lat, philly.lng];
    setLocation({ label: `${name}, Philadelphia`, lat, lng, source: "manual" });
    onClose();
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const value = manual.trim();
    if (!value) return;
    const match = philly.neighborhoods.find((n) => n.toLowerCase() === value.toLowerCase());
    if (match) return chooseNeighborhood(match);
    // Unknown address: fall back to the city centre and label what was typed,
    // rather than blocking the search.
    setLocation({ label: value, lat: philly.lat, lng: philly.lng, source: "manual" });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Where are you looking?"
      description="We use this to show what's actually available near you."
    >
      <div className="space-y-5">
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          loading={busy}
          onClick={useDevice}
          icon={<Crosshair className="h-4.5 w-4.5" />}
          className="justify-start"
        >
          Use my location
        </Button>
        {error && (
          <p className="-mt-3 rounded-xl bg-caution-50 px-3.5 py-2.5 text-[13px] text-caution-700">
            {error} You can still search by neighbourhood below.
          </p>
        )}

        <form onSubmit={submitManual}>
          <Field label="Or enter it manually" htmlFor="location-input">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <Input
                  id="location-input"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="Neighbourhood, address or ZIP"
                  className="pl-9"
                  autoComplete="postal-code"
                />
              </div>
              <Button type="submit" variant="outline">
                Set
              </Button>
            </div>
          </Field>
        </form>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink-soft">Philadelphia neighbourhoods</p>
          <div className="grid grid-cols-2 gap-2">
            {philly.neighborhoods.map((n) => {
              const active = location.label.startsWith(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => chooseNeighborhood(n)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-[13.5px] font-medium transition",
                    active
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-line bg-surface text-ink-soft hover:border-brand-200 hover:text-ink",
                  )}
                >
                  <span className="truncate">{n}</span>
                  {active && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl bg-sunken p-3.5">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            <MapPin className="h-3.5 w-3.5 text-brand-500" />
            More cities coming
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
            NOW is live in Philadelphia. {CITIES.filter((c) => !c.is_live).map((c) => c.name).join(", ")} are next.
          </p>
        </div>
      </div>
    </Modal>
  );
}
