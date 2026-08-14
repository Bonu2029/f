"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Avatar } from "@/components/ui/media";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { useActions, useMarketplace } from "@/lib/store";
import { dayLabel, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { MessageThread } from "@/lib/types";

/**
 * Booking-scoped messaging, shared by the customer app and the business
 * dashboard. Threads always belong to a business↔customer pair — there is no
 * way to start an open-ended conversation, which keeps this a support channel
 * rather than a social network.
 */

export interface ThreadSummary {
  thread: MessageThread;
  title: string;
  subtitle: string;
  avatarSeed: string;
  lastBody: string;
  unread: number;
}

export function useThreads(role: "customer" | "business"): ThreadSummary[] {
  const { state, session } = useMarketplace();

  return useMemo(() => {
    if (!state) return [];
    const mine = state.threads.filter((t) =>
      role === "customer" ? t.customer_id === session.userId : t.business_id === session.businessId,
    );

    return mine
      .map((thread) => {
        const business = state.businesses.find((b) => b.id === thread.business_id);
        const customer = state.users.find((u) => u.id === thread.customer_id);
        const messages = state.messages
          .filter((m) => m.thread_id === thread.id)
          .sort((a, b) => a.created_at.localeCompare(b.created_at));
        const appointment = thread.appointment_id
          ? state.appointments.find((a) => a.id === thread.appointment_id)
          : null;

        return {
          thread,
          title: role === "customer" ? (business?.name ?? "Business") : (customer?.full_name ?? "Customer"),
          subtitle: appointment
            ? `${dayLabel(appointment.date, new Date(state.now))} · ${formatTime(appointment.start_time)}`
            : role === "customer"
              ? (business?.neighborhood ?? "")
              : (customer?.email ?? ""),
          avatarSeed: role === "customer" ? `${business?.media_seed}-logo` : thread.customer_id,
          lastBody: messages[messages.length - 1]?.body ?? "",
          unread: role === "customer" ? thread.unread_for_customer : thread.unread_for_business,
        };
      })
      .sort((a, b) => b.thread.last_message_at.localeCompare(a.thread.last_message_at));
  }, [state, session.userId, session.businessId, role]);
}

export function ThreadList({
  threads,
  activeId,
  hrefFor,
  onSelect,
  emptyBody,
}: {
  threads: ThreadSummary[];
  activeId?: string;
  /** Navigate to a dedicated page (mobile / customer app). */
  hrefFor?: (id: string) => string;
  /** Select in place (desktop split view). */
  onSelect?: (id: string) => void;
  emptyBody: string;
}) {
  if (threads.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="h-5 w-5" />}
        title="No messages yet"
        body={emptyBody}
      />
    );
  }

  return (
    <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface">
      {threads.map(({ thread, title, subtitle, avatarSeed, lastBody, unread }) => {
        const inner = (
          <>
            <Avatar seed={avatarSeed} name={title} size={44} className="rounded-xl" />
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[14.5px] font-semibold text-ink">{title}</p>
                {unread > 0 && <Badge tone="brand">{unread}</Badge>}
              </div>
              <p className="truncate text-[12.5px] text-ink-muted">{subtitle}</p>
              <p className="mt-0.5 truncate text-[13px] text-ink-soft">{lastBody}</p>
            </div>
          </>
        );
        const className = cn(
          "flex w-full items-center gap-3 p-3.5 transition hover:bg-sunken/60",
          activeId === thread.id && "bg-brand-50",
        );
        return (
          <li key={thread.id}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(thread.id)} className={className}>
                {inner}
              </button>
            ) : (
              <Link href={hrefFor?.(thread.id) ?? "#"} className={className}>
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ThreadView({
  threadId,
  role,
  className,
}: {
  threadId: string;
  role: "customer" | "business";
  className?: string;
}) {
  const { state, session } = useMarketplace();
  const { sendMessage, markThreadRead } = useActions();
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const thread = state?.threads.find((t) => t.id === threadId) ?? null;
  const messages = useMemo(
    () =>
      (state?.messages ?? [])
        .filter((m) => m.thread_id === threadId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [state?.messages, threadId],
  );

  useEffect(() => {
    if (thread) markThreadRead(thread.id, role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  if (!state || !thread) {
    return (
      <EmptyState
        className={className}
        icon={<MessageSquare className="h-5 w-5" />}
        title="Pick a conversation"
        body="Messages are tied to a booking, so you'll see the appointment they refer to."
      />
    );
  }

  const business = state.businesses.find((b) => b.id === thread.business_id);
  const customer = state.users.find((u) => u.id === thread.customer_id);
  const appointment = thread.appointment_id
    ? state.appointments.find((a) => a.id === thread.appointment_id)
    : null;
  const title = role === "customer" ? (business?.name ?? "Business") : (customer?.full_name ?? "Customer");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    sendMessage({
      threadId: thread!.id,
      businessId: thread!.business_id,
      customerId: thread!.customer_id,
      appointmentId: thread!.appointment_id,
      body,
      role,
    });
    setDraft("");
  }

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-2xl border border-line bg-surface", className)}>
      <div className="flex items-center gap-3 border-b border-line-soft p-3.5">
        <Avatar
          seed={role === "customer" ? `${business?.media_seed}-logo` : thread.customer_id}
          name={title}
          size={40}
          className="rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink">{title}</p>
          {appointment && (
            <Link
              href={role === "customer" ? `/bookings/${appointment.id}` : `/dashboard/bookings`}
              className="truncate text-[12.5px] text-brand-600 hover:text-brand-700"
            >
              {dayLabel(appointment.date, new Date(state.now))} at {formatTime(appointment.start_time)} ·
              view booking
            </Link>
          )}
        </div>
      </div>

      <div className="min-h-[240px] flex-1 space-y-2.5 overflow-y-auto p-3.5">
        {messages.map((message) => {
          const mine = message.sender_role === role;
          if (message.sender_role === "system") {
            return (
              <p
                key={message.id}
                className="mx-auto max-w-sm rounded-xl bg-sunken px-3 py-2 text-center text-[12.5px] text-ink-muted"
              >
                {message.body}
              </p>
            );
          }
          return (
            <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2.5",
                  mine ? "bg-brand-500 text-white" : "bg-sunken text-ink",
                )}
              >
                <p className="text-[14px] leading-snug">{message.body}</p>
                <p className={cn("mt-1 text-[11px]", mine ? "text-white/70" : "text-ink-muted")}>
                  {new Date(message.created_at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-line-soft p-3">
        <label htmlFor="message-input" className="sr-only">
          Message
        </label>
        <input
          id="message-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/12"
        />
        <Button type="submit" size="icon" disabled={!draft.trim()} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {session.role === "guest" && (
        <p className="border-t border-line-soft px-3.5 py-2 text-[12px] text-ink-muted">
          Sign in to send messages.
        </p>
      )}
    </div>
  );
}
