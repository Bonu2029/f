import type { Metadata } from "next";
import { BusinessMessagesScreen } from "@/components/dashboard/ops-screens";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default function Page() {
  return <BusinessMessagesScreen />;
}
