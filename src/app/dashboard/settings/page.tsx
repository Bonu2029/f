import type { Metadata } from "next";
import { BusinessSettingsScreen } from "@/components/dashboard/money-screens";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default function Page() {
  return <BusinessSettingsScreen />;
}
