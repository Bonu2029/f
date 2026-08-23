import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { DemoBanner } from "@/components/dashboard/demo-banner";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { TagStatusBadge } from "@/components/dashboard/tag-status-badge";
import { CopyButton } from "@/components/dashboard/copy-button";
import { getSession } from "@/lib/session";
import { getTags } from "@/lib/data/dashboard";
import { formatShortDate, formatRelative } from "@/lib/format";
import { tagUrl, tagUrlDisplay } from "@/config/brand";

export const metadata: Metadata = { title: "Tags" };

export default async function TagsPage() {
  const session = await getSession();
  const tags = await getTags(session);

  return (
    <div className="space-y-8">
      {session.mode === "demo" ? <DemoBanner /> : null}

      <PageHeader
        title="Tags"
        description="Every tag you've placed, and what it's attached to."
        action={<ButtonLink href="/dashboard/tags/new">Activate Tag</ButtonLink>}
      />

      {tags.length === 0 ? (
        <EmptyState
          title="No tags yet"
          description="Activate your first tag to connect it to an installation."
          action={<ButtonLink href="/dashboard/tags/new">Activate Tag</ButtonLink>}
        />
      ) : (
        <>
          {/* Table on wide screens */}
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-white lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-muted text-xs tracking-wide text-ink-500 uppercase">
                <tr>
                  <th className="px-5 py-3 font-medium">Tag ID</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Installed Product</th>
                  <th className="px-5 py-3 font-medium">Install Date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Last Tap</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-surface-muted/50">
                    <td className="px-5 py-4 font-mono text-[0.8125rem] font-medium text-ink-950">
                      {tag.code}
                    </td>
                    <td className="px-5 py-4 text-ink-900">
                      {tag.installations?.customers?.name ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-ink-900">
                      {tag.installations?.product_name ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-ink-700">
                      {formatShortDate(tag.installations?.installed_on)}
                    </td>
                    <td className="px-5 py-4">
                      <TagStatusBadge status={tag.status} />
                    </td>
                    <td className="px-5 py-4 text-ink-700">
                      {tag.last_tapped_at ? formatRelative(tag.last_tapped_at) : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {tag.status === "active" ? (
                          <>
                            <Link
                              href={`/t/${tag.code}`}
                              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:bg-surface-muted hover:text-ink-950"
                            >
                              View page
                            </Link>
                            <CopyButton value={tagUrl(tag.code)} />
                          </>
                        ) : (
                          <ButtonLink
                            href={`/dashboard/tags/new?code=${tag.code}`}
                            variant="secondary"
                            size="sm"
                          >
                            Activate
                          </ButtonLink>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards on small screens */}
          <ul className="space-y-3 lg:hidden">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="rounded-2xl border border-line bg-white p-5 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium text-ink-950">
                      {tag.code}
                    </p>
                    <p className="mt-1 truncate text-[0.9375rem] font-medium text-ink-950">
                      {tag.installations?.product_name ?? "Not assigned yet"}
                    </p>
                    <p className="truncate text-sm text-ink-500">
                      {tag.installations?.customers?.name ?? "No customer"}
                    </p>
                  </div>
                  <TagStatusBadge status={tag.status} />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                  <div>
                    <dt className="text-ink-500">Installed</dt>
                    <dd className="text-ink-900">
                      {formatShortDate(tag.installations?.installed_on)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-500">Last tap</dt>
                    <dd className="text-ink-900">
                      {tag.last_tapped_at ? formatRelative(tag.last_tapped_at) : "—"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex items-center gap-2">
                  {tag.status === "active" ? (
                    <>
                      <ButtonLink
                        href={`/t/${tag.code}`}
                        variant="secondary"
                        size="sm"
                      >
                        View page
                      </ButtonLink>
                      <CopyButton
                        value={tagUrl(tag.code)}
                        label={tagUrlDisplay(tag.code)}
                      />
                    </>
                  ) : (
                    <ButtonLink
                      href={`/dashboard/tags/new?code=${tag.code}`}
                      size="sm"
                    >
                      Activate
                    </ButtonLink>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
