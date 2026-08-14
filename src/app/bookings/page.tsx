import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingsScreen } from "@/components/screens/bookings-screen";

export const metadata: Metadata = {
  title: "Your bookings",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BookingsScreen />
    </Suspense>
  );
}
