import { Hero } from "@/components/home/Hero";
import { Services } from "@/components/home/Services";
import { Barbers } from "@/components/home/Barbers";
import { Gallery } from "@/components/home/Gallery";
import { About } from "@/components/home/About";
import { Promo } from "@/components/home/Promo";
import { BookingSection } from "@/components/booking/BookingSection";
import { Reviews } from "@/components/home/Reviews";
import { Contact } from "@/components/home/Contact";
import { PageTransition } from "@/components/layout/PageTransition";

export default function HomePage() {
  return (
    <PageTransition>
      <Hero />
      <Services />
      <Barbers />
      <Gallery />
      <About />
      <Promo />
      <BookingSection />
      <Reviews />
      <Contact />
    </PageTransition>
  );
}
