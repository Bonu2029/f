import type { Metadata } from "next";
import { AdminOverviewScreen } from "@/components/admin/admin-screens";

export const metadata: Metadata = { title: "Admin overview", robots: { index: false } };

export default function Page() {
  return <AdminOverviewScreen />;
}
