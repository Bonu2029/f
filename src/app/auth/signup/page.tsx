import type { Metadata } from "next";
import { SignupScreen } from "@/components/auth/auth-screens";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Join NOW to book local services with real availability, or list your business.",
};

export default function Page() {
  return <SignupScreen />;
}
