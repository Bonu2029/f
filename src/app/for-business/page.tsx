import type { Metadata } from "next";
import { ForBusinessScreen } from "@/components/marketing/for-business";

export const metadata: Metadata = {
  title: "Grow your business with NOW",
  description:
    "Turn empty appointment slots into paying customers. Publish cancellations, reach nearby customers and get paid — commission only on bookings NOW brings you.",
  alternates: { canonical: "/for-business" },
  openGraph: {
    title: "Grow your business with NOW",
    description: "Turn empty appointment slots into paying customers.",
  },
};

export default function Page() {
  return <ForBusinessScreen />;
}
