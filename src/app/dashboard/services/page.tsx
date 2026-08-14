import type { Metadata } from "next";
import { ServicesScreen } from "@/components/dashboard/catalog-screens";

export const metadata: Metadata = { title: "Services", robots: { index: false } };

export default function Page() {
  return <ServicesScreen />;
}
