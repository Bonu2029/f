import type { Metadata } from "next";
import { OpenSlotsScreen } from "@/components/dashboard/open-slots-screen";

export const metadata: Metadata = { title: "Open slots", robots: { index: false } };

export default function Page() {
  return <OpenSlotsScreen />;
}
