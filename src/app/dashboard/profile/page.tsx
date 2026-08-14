import type { Metadata } from "next";
import { BusinessProfileScreen } from "@/components/dashboard/money-screens";

export const metadata: Metadata = { title: "Business profile", robots: { index: false } };

export default function Page() {
  return <BusinessProfileScreen />;
}
