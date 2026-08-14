import type { Metadata } from "next";
import { BusinessCustomersScreen } from "@/components/dashboard/ops-screens";

export const metadata: Metadata = { title: "Customers", robots: { index: false } };

export default function Page() {
  return <BusinessCustomersScreen />;
}
