import type { Metadata } from "next";
import { OverviewScreen } from "@/components/dashboard/overview-screen";

export const metadata: Metadata = { title: "Business overview", robots: { index: false } };

export default function Page() {
  return <OverviewScreen />;
}
