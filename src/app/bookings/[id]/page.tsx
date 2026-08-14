import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingDetail } from "@/components/screens/booking-detail";

export const metadata: Metadata = {
  title: "Booking details",
  robots: { index: false },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <BookingDetail appointmentId={id} />
    </Suspense>
  );
}
