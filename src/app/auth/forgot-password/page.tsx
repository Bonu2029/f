import type { Metadata } from "next";
import { ForgotPasswordScreen } from "@/components/auth/auth-screens";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function Page() {
  return <ForgotPasswordScreen />;
}
