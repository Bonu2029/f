import type { Metadata } from "next";
import { AdminDisputesScreen } from "@/components/admin/admin-screens";

export const metadata: Metadata = { title: "Disputes", robots: { index: false } };

export default function Page() {
  return <AdminDisputesScreen />;
}
