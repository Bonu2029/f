import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking/booking-flow";

export const metadata: Metadata = {
  title: "Confirm your booking",
  robots: { index: false },
};

export default async function Page({ params }: { params: Promise<{ slotId: string }> }) {
  const { slotId } = await params;
  return <BookingFlow slotId={slotId} />;
}
