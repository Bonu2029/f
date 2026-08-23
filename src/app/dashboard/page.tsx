import { ButtonLink } from "@/components/ui/button";
import { DemoBanner } from "@/components/dashboard/demo-banner";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { getSession } from "@/lib/session";
import { getOverview } from "@/lib/data/dashboard";
import { formatRelative } from "@/lib/format";

export default async function OverviewPage() {
  const session = await getSession();
  const overview = await getOverview(session);

  return (
    <div className="space-y-8">
      {session.mode === "demo" ? <DemoBanner /> : null}

      <PageHeader
        title={`Hello, ${session.business.name}`}
        description="Here's what's happening with your tags."
        action={
          <ButtonLink href="/dashboard/tags/new" size="md">
            Activate Tag
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Tags" value={overview.activeTags} />
        <StatCard label="Tag Taps" value={overview.tagTaps} />
        <StatCard label="Service Requests" value={overview.serviceRequests} />
        <StatCard
          label="Customers Returned"
          value={overview.customersReturned}
          hint="Customers who tapped a tag"
        />
      </div>

      <section>
        <h2 className="text-lg font-semibold text-ink-950">Recent Activity</h2>

        {overview.activity.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Nothing yet"
              description="Activity appears here once you activate a tag and customers start tapping."
              action={
                <ButtonLink href="/dashboard/tags/new" variant="secondary">
                  Activate your first tag
                </ButtonLink>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {overview.activity.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-[0.9375rem] font-medium text-ink-950">
                    {item.title}
                  </p>
                  <p className="truncate text-sm text-ink-500">{item.detail}</p>
                </div>
                <span className="shrink-0 text-sm text-ink-400">
                  {formatRelative(item.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
