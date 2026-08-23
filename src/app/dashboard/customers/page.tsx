import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { DemoBanner } from "@/components/dashboard/demo-banner";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { getSession } from "@/lib/session";
import { getCustomers, getTags } from "@/lib/data/dashboard";
import { formatShortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  const session = await getSession();
  const [customers, tags] = await Promise.all([
    getCustomers(session),
    getTags(session),
  ]);

  const installsByCustomer = new Map<string, string[]>();
  for (const tag of tags) {
    const customerId = tag.installations?.customers?.id;
    const product = tag.installations?.product_name;
    if (!customerId || !product) continue;
    installsByCustomer.set(customerId, [
      ...(installsByCustomer.get(customerId) ?? []),
      product,
    ]);
  }

  return (
    <div className="space-y-8">
      {session.mode === "demo" ? <DemoBanner /> : null}

      <PageHeader
        title="Customers"
        description="Everyone you've installed something for."
      />

      {customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Customers are added automatically when you activate a tag."
          action={<ButtonLink href="/dashboard/tags/new">Activate Tag</ButtonLink>}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {customers.map((customer) => (
            <li
              key={customer.id}
              className="rounded-2xl border border-line bg-white p-5 shadow-soft"
            >
              <p className="text-[1.0625rem] font-medium text-ink-950">
                {customer.name}
              </p>
              <p className="mt-0.5 text-sm text-ink-500">
                Added {formatShortDate(customer.created_at)}
              </p>

              <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
                {customer.phone ? (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-ink-500">Phone</dt>
                    <dd className="text-ink-900">{customer.phone}</dd>
                  </div>
                ) : null}
                {customer.email ? (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-ink-500">Email</dt>
                    <dd className="truncate text-ink-900">{customer.email}</dd>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-ink-500">Installed</dt>
                  <dd className="text-ink-900">
                    {installsByCustomer.get(customer.id)?.join(", ") ?? "—"}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
