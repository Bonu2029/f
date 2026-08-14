import type { Metadata } from "next";
import { TeamScreen } from "@/components/dashboard/catalog-screens";

export const metadata: Metadata = { title: "Team", robots: { index: false } };

export default function Page() {
  return <TeamScreen />;
}
