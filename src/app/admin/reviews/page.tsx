import type { Metadata } from "next";
import { AdminReviewsScreen } from "@/components/admin/admin-screens";

export const metadata: Metadata = { title: "Reviews", robots: { index: false } };

export default function Page() {
  return <AdminReviewsScreen />;
}
