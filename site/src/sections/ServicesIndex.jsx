import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Arrow, EASE, Reveal } from "../components/motion.jsx";

export const SERVICES = [
  {
    id: "window-install", t: "Window installation & replacement",
    c1: "Replace tired, drafty or damaged windows with units chosen for your home's style and how you use each room. We handle removal, installation and finishing.",
    list: ["Double-hung, casement, sliding, picture, bay & awning", "Material, colour and glass guidance", "Removal and haul-away of old units", "Interior and exterior finishing"],
    cta: ["Estimate windows", "#estimate"], cta2: ["See samples at home", "#book"],
  },
  {
    id: "door-install", t: "Door installation & replacement",
    c1: "Entry, patio, French and storm doors fitted for smooth operation, security and a weather-tight seal — with hardware and glass to match your home.",
    list: ["Entry, patio sliding, French & storm doors", "Hardware and decorative glass options", "Frame, threshold and trim work", "Removal and disposal of the old door"],
    cta: ["Estimate a door", "#estimate"], cta2: ["See samples at home", "#book"],
  },
  {
    id: "window-repair", t: "Window repair",
    c1: "Often a window just needs the right fix. We'll diagnose the problem and recommend the simplest sound repair before suggesting replacement.",
    list: ["Foggy or failed glass seals", "Sticking sashes and broken balances", "Hardware, locks and cranks", "Drafts, leaks and minor rot"],
    cta: ["Describe your repair", "#estimate"], cta2: ["Ask a question", "#contact"],
  },
  {
    id: "door-repair", t: "Door repair",
    c1: "Doors that stick, drag, rattle or let in weather can usually be adjusted or repaired. We'll tell you plainly what's worth fixing.",
    list: ["Sticking, sagging or misaligned doors", "Locks, hinges and hardware", "Weatherstripping and thresholds", "Frame and jamb damage"],
    cta: ["Describe your repair", "#estimate"], cta2: ["Ask a question", "#contact"],
  },
  {
    id: "restoration", t: "Historic window & door restoration",
    c1: "For original and period windows and doors, we begin with an assessment. Where restoration is practical, we repair and refinish to preserve your home's architectural character.",
    list: ["On-site condition assessment", "Wood repair and consolidation", "Reglazing, sash freeing and refitting", "Finishing to suit the house"],
    cta: ["Request an assessment", "#book"], cta2: ["Estimate restoration", "#estimate"],
  },
  {
    id: "showroom", t: "Mobile showroom visits",
    c1: "Request a visit, compare physical samples in your own home, discuss your project with us, and receive a proposal once the details are confirmed.",
    list: ["Request a visit time that suits you", "Handle real materials, glass & hardware", "Talk through every opening", "Written proposal after the visit"],
    cta: ["Book the showroom", "#book"], cta2: ["Start with an estimate", "#estimate"],
  },
];

export default function ServicesIndex() {
  const [open, setOpen] = useState("window-install");
  return (
    <section className="section bg-paper" id="all-services" aria-labelledby="idx-h">
      <div className="wrap">
        <div className="sec-head">
          <Reveal>
            <p className="eyebrow">Services in detail</p>
            <h2 className="display h-lg" id="idx-h">Six ways we <em>can help.</em></h2>
          </Reveal>
          <Reveal delay={0.1}><p className="lede">Choose a service to see what's included and the best next step.</p></Reveal>
        </div>
        <div className="svc-index">
          {SERVICES.map((s, i) => {
            const isOpen = open === s.id;
            return (
              <div className="svc-row" key={s.id} id={`svc-${s.id}`} data-open={isOpen}>
                <h3>
                  <button className="head" aria-expanded={isOpen} aria-controls={`body-${s.id}`} onClick={() => setOpen(isOpen ? null : s.id)}>
                    <span className="num">0{i + 1}</span>
                    <span className="t">{s.t}</span>
                    <span className="plus" aria-hidden="true" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div id={`body-${s.id}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.55, ease: EASE }} style={{ overflow: "hidden" }}>
                      <div className="svc-body">
                        <div className="c1">
                          <p className="lede">{s.c1}</p>
                          <div className="actions">
                            <a className="btn btn-sm" href={s.cta[1]}>{s.cta[0]} <Arrow size={14} /></a>
                            <a className="btn btn-sm btn-ghost" href={s.cta2[1]}>{s.cta2[0]}</a>
                          </div>
                        </div>
                        <ul className="c2">{s.list.map((l) => <li key={l}>{l}</li>)}</ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
