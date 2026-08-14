import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth/auth-screens";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function Page() {
  return <LoginScreen />;
}
