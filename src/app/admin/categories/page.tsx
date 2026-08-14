import type { Metadata } from "next";
import { AdminCategoriesScreen } from "@/components/admin/admin-screens";

export const metadata: Metadata = { title: "Categories", robots: { index: false } };

export default function Page() {
  return <AdminCategoriesScreen />;
}
