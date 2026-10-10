import ImageSlot from "../components/ImageSlot.jsx";
import { Arrow, ClipReveal, Reveal } from "../components/motion.jsx";

const STORIES = [
  {
    n: "01", img: "svcWindowInstall", cls: "",
    eyebrow: "Windows · Installation & replacement",
    title: <>Light, framed <em>beautifully.</em></>,
    body: "From a single drafty window to a whole-home replacement, we help you choose styles and finishes that suit your architecture — then install them carefully, cleanly, and square.",
    points: ["Guidance on style, material and glass", "Careful removal of existing units", "Clean interior and exterior finishing"],
    cta: ["Estimate a window project", "#estimate"],
  },
  {
    n: "02", img: "svcDoorInstall", cls: "flip",
    eyebrow: "Doors · Installation & replacement",
    title: <>An entrance with <em>presence.</em></>,
    body: "Entry, patio, French and storm doors fitted to open smoothly, close securely, and look like they've always belonged to your home.",
    points: ["Entry, patio, French & storm doors", "Hardware and glass options", "Precise fit, weather-tight finish"],
    cta: ["Estimate a door project", "#estimate"],
  },
  {
    n: "03", img: "svcRepair", cls: "small",
    eyebrow: "Repairs · Windows & doors",
    title: <>Make it work like it <em>should.</em></>,
    body: "Sticking sashes, foggy glass, failing hardware, drafts and leaks. We diagnose the cause and recommend the simplest sound fix — repair first, replacement only when it makes sense.",
    points: ["Hardware, balances & seals", "Glass and weatherstripping", "Honest repair-or-replace advice"],
    cta: ["Describe a repair", "#estimate"],
  },
];

export default function ServicesStory() {
  return (
    <section className="section" id="services" aria-labelledby="services-h">
      <div className="wrap">
        <div className="sec-head">
          <Reveal>
            <p className="eyebrow">What we do</p>
            <h2 className="display h-lg" id="services-h">Installed with care. <em>Repaired with honesty.</em></h2>
          </Reveal>
          <Reveal delay={0.1}><p className="lede">Every project starts with your home — its proportions, its light, its history. Here's how we can help.</p></Reveal>
        </div>

        {STORIES.map((s) => (
          <article className={`story ${s.cls}`} key={s.n}>
            <div className="media">
              <ClipReveal from={s.cls === "flip" ? "right" : "left"}>
                <ImageSlot id={s.img} />
              </ClipReveal>
              <div className="caption"><span>{s.n}</span><span>{s.eyebrow.split(" · ")[0]}</span></div>
            </div>
            <div className="copy">
              <Reveal><p className="eyebrow">{s.eyebrow}</p></Reveal>
              <Reveal delay={0.08}><h3 className="display h-md">{s.title}</h3></Reveal>
              <Reveal delay={0.14}><p className="lede">{s.body}</p></Reveal>
              <Reveal delay={0.2}>
                <ul>{s.points.map((p) => <li key={p}>{p}</li>)}</ul>
                <a className="link" href={s.cta[1]}>{s.cta[0]} <Arrow /></a>
              </Reveal>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
