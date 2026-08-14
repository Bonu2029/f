import type { Metadata } from "next";
import { AccountScreen } from "@/components/screens/account-screens";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default function Page() {
  return <AccountScreen />;
}
