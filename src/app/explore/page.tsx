import type { Metadata } from "next";
import { ExploreScreen } from "@/components/screens/explore-screen";

export const metadata: Metadata = {
  title: "Explore local services",
  description: "Browse every category, neighbourhood and business with live availability near you.",
  alternates: { canonical: "/explore" },
};

export default function Page() {
  return <ExploreScreen />;
}
