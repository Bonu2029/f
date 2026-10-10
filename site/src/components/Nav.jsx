import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { COMPANY } from "../config/company.js";
import { EASE } from "./motion.jsx";

const LINKS = [
  ["Services", "#services"],
  ["Restoration", "#restoration"],
  ["Showroom", "#showroom"],
  ["Estimate", "#estimate"],
  ["Projects", "#gallery"],
  ["FAQ", "#faq"],
  ["Contact", "#contact"],
];

export default function Nav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setSolid(window.scrollY > window.innerHeight * 0.75);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const esc = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <>
      <header className={`nav ${solid || open ? "solid" : ""}`}>
        <div className="wrap">
          <a className="brand" href="#top" aria-label={`${COMPANY.name} — home`}>
            <b>{COMPANY.name}</b>
            <span>{COMPANY.tagline}</span>
          </a>
          <nav aria-label="Primary">
            <ul className="nav-links">
              {LINKS.map(([l, h]) => <li key={h}><a href={h}>{l}</a></li>)}
            </ul>
          </nav>
          <div className="nav-cta">
            <a className="btn btn-sm hide-md" href="#estimate">Get an Estimate</a>
            <button
              className="menu-btn"
              aria-expanded={open}
              aria-controls="drawer"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
            >
              <span /><span />
            </button>
          </div>
        </div>
      </header>
      <AnimatePresence>
        {open && (
          <motion.div
            id="drawer"
            className="drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            {LINKS.map(([l, h], i) => (
              <motion.a
                key={h}
                className="d-link"
                href={h}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.04, duration: 0.6, ease: EASE }}
              >
                {l} <small>0{i + 1}</small>
              </motion.a>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap" }}>
              <a className="btn" href="#estimate" onClick={() => setOpen(false)}>Get an Estimate</a>
              <a className="btn btn-ghost" href="#book" onClick={() => setOpen(false)}>Book Showroom</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function MobileBar() {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    const fn = () => {
      const pastHero = window.scrollY > window.innerHeight * 0.6;
      const atEnd = window.innerHeight + window.scrollY > document.body.scrollHeight - 40;
      setHidden(!pastHero || atEnd);
    };
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <div className={`mbar ${hidden ? "hidden" : ""}`} aria-label="Quick actions">
      <a className="primary" href="#estimate" tabIndex={hidden ? -1 : 0}>Get an Estimate</a>
      <a href="#book" tabIndex={hidden ? -1 : 0}>Book Showroom</a>
    </div>
  );
}
