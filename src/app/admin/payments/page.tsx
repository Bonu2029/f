import type { Metadata } from "next";
import { AdminPaymentsScreen } from "@/components/admin/admin-screens";

export const metadata: Metadata = { title: "Payments", robots: { index: false } };

export default function Page() {
  return <AdminPaymentsScreen />;
}
