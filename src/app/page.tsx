import Preloader from "@/components/sections/Preloader";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Cursor from "@/components/motion/Cursor";
import DecorObserver from "@/components/motion/DecorObserver";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import MobileBookBar from "@/components/layout/MobileBookBar";

import Hero from "@/components/sections/Hero";
import Marquee from "@/components/sections/Marquee";
import Services from "@/components/sections/Services";
import Transformations from "@/components/sections/Transformations";
import Studio from "@/components/sections/Studio";
import Gallery from "@/components/sections/Gallery";
import Reviews from "@/components/sections/Reviews";
import Booking from "@/components/sections/Booking";
import Visit from "@/components/sections/Visit";

import { getGoogleReviews } from "@/lib/reviews";

export default async function Home() {
  // Fetched on the server, cached for an hour — the hero rating badge and the
  // reviews section read from the same payload so they can never disagree.
  const reviews = await getGoogleReviews();

  return (
    <>
      <Preloader />
      <SmoothScroll />
      <Cursor />
      <DecorObserver />
      <Nav />

      <main id="main">
        <Hero reviews={reviews} />
        <Marquee />
        <Services />
        <Transformations />
        <Studio />
        <Gallery />
        <Reviews payload={reviews} />
        <Booking />
        <Visit />
      </main>

      <Footer />
      <MobileBookBar />
    </>
  );
}
