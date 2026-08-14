"use client";

import Link from "next/link";
import { Bell, BellOff, Heart } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { BusinessCard } from "@/components/marketplace/business-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/media";
import { Card, EmptyState, Rating, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useDiscovery, useFavorites } from "@/lib/hooks";
import { useActions, useMarketplace } from "@/lib/store";
import { EMPTY_FILTERS, groupIntoBusinessViews } from "@/lib/store/selectors";

export function FavoritesScreen() {
  const discovery = useDiscovery();
  const { session, signIn } = useMarketplace();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { setFavoriteAlerts } = useActions();
  const { toast } = useToast();

  if (!discovery) {
    return (
      <CustomerShell>
        <div className="space-y-3 pt-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      </CustomerShell>
    );
  }

  if (!session.userId) {
    return (
      <CustomerShell>
        <div className="py-14">
          <EmptyState
            icon={<Heart className="h-5 w-5" />}
            title="Save businesses you love"
            body="Favourites make rebooking one tap, and you can get alerted when they open up a same-day slot."
            action={<Button onClick={() => signIn("customer")}>Continue as Maya</Button>}
          />
        </div>
      </CustomerShell>
    );
  }

  const favorites = discovery.state.favorites.filter((f) => f.customer_id === session.userId);
  const withAvailability = groupIntoBusinessViews(
    discovery.slots.filter((s) => favoriteIds.has(s.business.id)),
    discovery.state,
    { ...EMPTY_FILTERS, sort: "soonest" },
  );
  const noAvailability = favorites
    .map((f) => discovery.state.businesses.find((b) => b.id === f.business_id))
    .filter((b) => b && !withAvailability.some((v) => v.business.id === b.id));

  return (
    <CustomerShell>
      <div className="pt-5">
        <h1 className="text-[26px] font-bold tracking-[-0.03em] text-ink">Favourites</h1>
        <p className="mt-0.5 text-[13.5px] text-ink-muted">
          {favorites.length} saved {favorites.length === 1 ? "business" : "businesses"}
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Heart className="h-5 w-5" />}
            title="Save businesses you love for faster booking"
            body="Tap the heart on any business and it'll show up here, with their next opening."
            action={<ButtonLink href="/search">Find somewhere</ButtonLink>}
          />
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {withAvailability.map((v) => (
              <BusinessCard
                key={v.business.id}
                view={v}
                now={discovery.now}
                isFavorite
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>

          {noAvailability.length > 0 && (
            <div className="mt-5">
              <h2 className="px-1 text-[15px] font-semibold text-ink">No openings right now</h2>
              <div className="mt-2.5 grid gap-2.5">
                {noAvailability.map(
                  (business) =>
                    business && (
                      <Card key={business.id} className="flex items-center gap-3.5 p-3.5">
                        <Avatar
                          seed={`${business.media_seed}-logo`}
                          name={business.name}
                          size={44}
                          className="rounded-xl"
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/business/${business.slug}`}
                            className="truncate text-[15px] font-semibold text-ink hover:text-brand-600"
                          >
                            {business.name}
                          </Link>
                          <div className="mt-0.5 flex items-center gap-2.5 text-[12.5px] text-ink-muted">
                            <Rating value={business.rating} count={business.review_count} />
                            <span>{business.neighborhood}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleFavorite(business.id)}
                        >
                          Remove
                        </Button>
                      </Card>
                    ),
                )}
              </div>
            </div>
          )}

          <Card className="mt-5 p-4">
            <h2 className="text-[15px] font-semibold text-ink">Opening alerts</h2>
            <p className="mt-1 text-[13px] text-ink-muted">
              Get notified when a favourite publishes a same-day opening — for example,
              &ldquo;Modern Cuts has an opening today at 5:00 PM.&rdquo;
            </p>
            <div className="mt-3 divide-y divide-line-soft">
              {favorites.map((f) => {
                const business = discovery.state.businesses.find((b) => b.id === f.business_id);
                if (!business) return null;
                return (
                  <div key={f.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="truncate text-[14px] text-ink">{business.name}</span>
                    <Button
                      size="sm"
                      variant={f.alert_on_opening ? "secondary" : "outline"}
                      icon={
                        f.alert_on_opening ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />
                      }
                      onClick={() => {
                        setFavoriteAlerts(business.id, !f.alert_on_opening);
                        toast({
                          title: f.alert_on_opening ? "Alerts off" : "Alerts on",
                          description: `${business.name} · same-day openings`,
                          tone: "success",
                        });
                      }}
                    >
                      {f.alert_on_opening ? "On" : "Off"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      <div className="h-6" />
    </CustomerShell>
  );
}
