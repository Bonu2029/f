import Nav, { MobileBar } from "./components/Nav.jsx";
import Hero from "./sections/Hero.jsx";
import Statement from "./sections/Statement.jsx";
import ServicesStory from "./sections/ServicesStory.jsx";
import Craft from "./sections/Craft.jsx";
import Restoration from "./sections/Restoration.jsx";
import Showroom from "./sections/Showroom.jsx";
import MeasurePreview from "./sections/MeasurePreview.jsx";
import ServicesIndex from "./sections/ServicesIndex.jsx";
import Estimator from "./estimator/Estimator.jsx";
import Gallery from "./sections/Gallery.jsx";
import Faq from "./sections/Faq.jsx";
import Forms from "./sections/Forms.jsx";
import Closing, { Footer } from "./sections/Closing.jsx";
import { MotionConfig } from "framer-motion";

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main">Skip to content</a>
      <Nav />
      <main id="main">
        <Hero />
        <Statement />
        <ServicesStory />
        <Craft />
        <Restoration />
        <Showroom />
        <MeasurePreview />
        <ServicesIndex />
        <Estimator />
        <Gallery />
        <Faq />
        <Forms />
        <Closing />
      </main>
      <Footer />
      <MobileBar />
    </MotionConfig>
  );
}
