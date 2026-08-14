import type { Metadata } from "next";
import { HomeScreen } from "@/components/screens/home-screen";

export const metadata: Metadata = {
  title: "NOW — Available when you need it",
  description:
    "What do you need right now? Find haircuts, nails, cleaning, detailing and more with real availability near you today.",
  alternates: { canonical: "/" },
};

export default function Page() {
  return <HomeScreen />;
}
