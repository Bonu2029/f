import type { Metadata } from "next";
import { OnboardingScreen } from "@/components/marketing/onboarding";

export const metadata: Metadata = { title: "List your business", robots: { index: false } };

export default function Page() {
  return <OnboardingScreen />;
}
