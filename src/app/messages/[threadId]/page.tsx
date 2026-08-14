import type { Metadata } from "next";
import { MessagesScreen } from "@/components/screens/messages-screen";

export const metadata: Metadata = { title: "Conversation", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  return <MessagesScreen threadId={threadId} />;
}
