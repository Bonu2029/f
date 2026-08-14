import type { Metadata } from "next";
import { CalendarScreen } from "@/components/dashboard/calendar-screen";

export const metadata: Metadata = { title: "Calendar", robots: { index: false } };

export default function Page() {
  return <CalendarScreen />;
}
