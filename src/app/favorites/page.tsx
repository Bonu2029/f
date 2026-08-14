import type { Metadata } from "next";
import { FavoritesScreen } from "@/components/screens/favorites-screen";

export const metadata: Metadata = { title: "Favourites", robots: { index: false } };

export default function Page() {
  return <FavoritesScreen />;
}
