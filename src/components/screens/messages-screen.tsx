"use client";

import { CustomerShell } from "@/components/layout/customer-shell";
import { ThreadList, ThreadView, useThreads } from "@/components/messaging/conversation";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { useMarketplace } from "@/lib/store";
import { MessageSquare } from "lucide-react";

export function MessagesScreen({ threadId }: { threadId?: string }) {
  const { state, session, signIn } = useMarketplace();
  const threads = useThreads("customer");

  if (!state) {
    return (
      <CustomerShell>
        <div className="space-y-3 pt-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </CustomerShell>
    );
  }

  if (!session.userId) {
    return (
      <CustomerShell>
        <div className="py-14">
          <EmptyState
            icon={<MessageSquare className="h-5 w-5" />}
            title="Sign in to see your messages"
            body="Messages here are always attached to a booking — running late, parking, a quick question."
            action={<Button onClick={() => signIn("customer")}>Continue as Maya</Button>}
          />
        </div>
      </CustomerShell>
    );
  }

  if (threadId) {
    return (
      <CustomerShell header="compact" title="Messages" backHref="/messages">
        <div className="py-4">
          <ThreadView threadId={threadId} role="customer" className="min-h-[60vh]" />
        </div>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell>
      <div className="pt-5">
        <h1 className="text-[26px] font-bold tracking-[-0.03em] text-ink">Messages</h1>
        <p className="mt-0.5 text-[13.5px] text-ink-muted">
          Conversations with businesses you&rsquo;ve booked.
        </p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,340px)_1fr]">
        <ThreadList
          threads={threads}
          hrefFor={(id) => `/messages/${id}`}
          emptyBody="Once you book, you can message the business here about timing, parking or anything else."
        />
        <div className="hidden lg:block">
          {threads[0] ? (
            <ThreadView threadId={threads[0].thread.id} role="customer" className="h-full" />
          ) : null}
        </div>
      </div>

      <div className="h-6" />
    </CustomerShell>
  );
}
