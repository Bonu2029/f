import type { Metadata } from "next";
import { BusinessReviewsScreen } from "@/components/dashboard/ops-screens";

export const metadata: Metadata = { title: "Reviews", robots: { index: false } };

export default function Page() {
  return <BusinessReviewsScreen />;
}
