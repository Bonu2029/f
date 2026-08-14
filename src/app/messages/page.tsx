import type { Metadata } from "next";
import { MessagesScreen } from "@/components/screens/messages-screen";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default function Page() {
  return <MessagesScreen />;
}
