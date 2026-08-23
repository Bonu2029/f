import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { DemoBanner } from "@/components/dashboard/demo-banner";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { RequestCard } from "@/components/dashboard/request-card";
import { getSession } from "@/lib/session";
import {
  getRequestPhotoUrls,
  getServiceRequests,
  getTags,
} from "@/lib/data/dashboard";

export const metadata: Metadata = { title: "Service Requests" };

export default async function RequestsPage() {
  const session = await getSession();
  const [requests, tags] = await Promise.all([
    getServiceRequests(session),
    getTags(session),
  ]);

  const photoUrls = await getRequestPhotoUrls(session, requests);
  const codeByTagId = new Map(tags.map((tag) => [tag.id, tag.code]));
  const open = requests.filter((request) => request.status !== "closed");
  const closed = requests.filter((request) => request.status === "closed");

  return (
    <div className="space-y-8">
      {session.mode === "demo" ? <DemoBanner /> : null}

      <PageHeader
        title="Service Requests"
        description="Requests sent from your tag pages."
      />

      {requests.length === 0 ? (
        <EmptyState
          title="No requests yet"
          description="When a customer taps a tag and asks for service, it shows up here."
          action={
            <ButtonLink href="/dashboard/tags/new" variant="secondary">
              Activate a tag
            </ButtonLink>
          }
        />
      ) : (
        <div className="space-y-8">
          <ul className="space-y-3">
            {open.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                tagCode={
                  request.tag_id ? codeByTagId.get(request.tag_id) : undefined
                }
                photoUrl={
                  request.photo_url ? photoUrls.get(request.photo_url) : undefined
                }
              />
            ))}
          </ul>

          {closed.length > 0 ? (
            <section>
              <h2 className="text-sm font-medium tracking-wide text-ink-500 uppercase">
                Closed
              </h2>
              <ul className="mt-3 space-y-3">
                {closed.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    tagCode={
                      request.tag_id ? codeByTagId.get(request.tag_id) : undefined
                    }
                    photoUrl={
                      request.photo_url
                        ? photoUrls.get(request.photo_url)
                        : undefined
                    }
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
