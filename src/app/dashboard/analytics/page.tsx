import type { Metadata } from "next";
import { BusinessAnalyticsScreen } from "@/components/dashboard/money-screens";

export const metadata: Metadata = { title: "Analytics", robots: { index: false } };

export default function Page() {
  return <BusinessAnalyticsScreen />;
}
