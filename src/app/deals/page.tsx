import type { Metadata } from "next";
import { DealsScreen } from "@/components/screens/deals-screen";

export const metadata: Metadata = {
  title: "Last-minute deals",
  description:
    "Discounted last-minute appointment openings near you today — haircuts, nails, massage, detailing and more.",
  alternates: { canonical: "/deals" },
};

export default function Page() {
  return <DealsScreen />;
}
