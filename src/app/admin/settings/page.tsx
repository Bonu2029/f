import type { Metadata } from "next";
import { AdminSettingsScreen } from "@/components/admin/admin-screens";

export const metadata: Metadata = { title: "Platform settings", robots: { index: false } };

export default function Page() {
  return <AdminSettingsScreen />;
}
