import type { Metadata } from "next";
import { BusinessBookingsScreen } from "@/components/dashboard/ops-screens";

export const metadata: Metadata = { title: "Bookings", robots: { index: false } };

export default function Page() {
  return <BusinessBookingsScreen />;
}
