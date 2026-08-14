import type { Metadata } from "next";
import { AdminBusinessesScreen } from "@/components/admin/admin-screens";

export const metadata: Metadata = { title: "Businesses", robots: { index: false } };

export default function Page() {
  return <AdminBusinessesScreen />;
}
