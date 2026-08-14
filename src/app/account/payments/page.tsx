import type { Metadata } from "next";
import { PaymentMethodsScreen } from "@/components/screens/account-screens";

export const metadata: Metadata = { title: "Payment methods", robots: { index: false } };

export default function Page() {
  return <PaymentMethodsScreen />;
}
