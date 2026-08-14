import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchScreen } from "@/components/screens/search-screen";
import { SkeletonCard } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Search availability",
  description:
    "Search local services with real openings near you. Filter by time, price, distance, rating and last-minute deals.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 sm:px-6">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      }
    >
      <SearchScreen />
    </Suspense>
  );
}
