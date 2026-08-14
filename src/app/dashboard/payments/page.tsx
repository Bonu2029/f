import type { Metadata } from "next";
import { BusinessPaymentsScreen } from "@/components/dashboard/money-screens";

export const metadata: Metadata = { title: "Payments", robots: { index: false } };

export default function Page() {
  return <BusinessPaymentsScreen />;
}
