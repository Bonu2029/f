import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import ImageSlot from "../components/ImageSlot.jsx";
import { Arrow, Reveal, useCalmMotion } from "../components/motion.jsx";
import { COMPANY } from "../config/company.js";

export default function Closing() {
  const ref = useRef(null);
  const { simple } = useCalmMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], simple ? ["0%", "0%"] : ["-6%", "6%"]);
  return (
    <section className="closing" ref={ref} aria-labelledby="close-h">
      <motion.div className="bg" style={{ y }}><ImageSlot id="closing" tone="dark" /></motion.div>
      <div className="wrap">
        <Reveal><p className="eyebrow" style={{ color: "rgba(244,239,230,.8)", justifyContent: "center" }}>Begin your project</p></Reveal>
        <Reveal delay={0.08}><h2 className="display h-lg" id="close-h">Let's open something <em>beautiful.</em></h2></Reveal>
        <Reveal delay={0.16}>
          <div className="actions">
            <a className="btn btn-light" href="#estimate">Request an Estimate <Arrow /></a>
            <a className="btn btn-outline-light" href="#book">Book a Showroom Visit</a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="cols">
          <div>
            <div className="brand" style={{ color: "var(--on-dark)" }}><b>{COMPANY.name}</b><span>{COMPANY.tagline}</span></div>
            <p style={{ marginTop: 20, maxWidth: 30 + "em" }}>Window and door installation, repair, historic restoration, and a mobile showroom — serving Philadelphia and New Jersey.</p>
          </div>
          <div><h5>Services</h5><ul>
            <li><a href="#all-services">Window installation</a></li><li><a href="#all-services">Door installation</a></li>
            <li><a href="#all-services">Window & door repair</a></li><li><a href="#restoration">Historic restoration</a></li><li><a href="#showroom">Mobile showroom</a></li>
          </ul></div>
          <div><h5>Plan</h5><ul>
            <li><a href="#estimate">Measure & estimate</a></li><li><a href="#book">Book showroom</a></li><li><a href="#gallery">Projects</a></li><li><a href="#faq">FAQ</a></li>
          </ul></div>
          <div><h5>Contact</h5><ul>
            <li className="ph-txt" style={{ width: "fit-content" }}>{COMPANY.phone}</li>
            <li className="ph-txt" style={{ width: "fit-content" }}>{COMPANY.email}</li>
            <li className="ph-txt" style={{ width: "fit-content" }}>{COMPANY.address}</li>
          </ul></div>
        </div>
        <div className="bottom">
          <span>© {new Date().getFullYear()} {COMPANY.name}. <span className="ph-txt">{COMPANY.license}</span></span>
          <span>Estimates on this site are preliminary. Final pricing requires inspection and confirmed measurements.</span>
        </div>
      </div>
    </footer>
  );
}
