import type { Metadata } from "next";
import { AdminBookingsScreen } from "@/components/admin/admin-screens";

export const metadata: Metadata = { title: "Bookings", robots: { index: false } };

export default function Page() {
  return <AdminBookingsScreen />;
}
