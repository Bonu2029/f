import ImageSlot from "../components/ImageSlot.jsx";
import { Arrow, ClipReveal, Reveal } from "../components/motion.jsx";

const SEQ = [
  ["showroomArrive", "i.", "We arrive at your door with the showroom."],
  ["showroomPresent", "ii.", "Samples are presented in your own light."],
  ["showroomCompare", "iii.", "Compare finishes beside your windows and trim."],
];
const STEPS = [
  ["Request a visit", "Tell us about your project and a few times that suit you."],
  ["Compare samples at home", "See and handle physical materials, glass and hardware in your space."],
  ["Discuss your project", "Walk through your openings, priorities and budget together."],
  ["Receive a proposal", "We follow up with a clear written proposal once details are confirmed."],
];

export default function Showroom() {
  return (
    <section className="section" id="showroom" aria-labelledby="showroom-h">
      <div className="wrap">
        <div className="sec-head">
          <Reveal>
            <p className="eyebrow">Mobile showroom</p>
            <h2 className="display h-lg" id="showroom-h">The showroom <em>comes to you.</em></h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lede">Colours and finishes look different in every home. Our mobile showroom brings real samples to your door, so you can decide in the light you actually live with.</p>
            <div style={{ marginTop: 28 }}><a className="btn" href="#book">Book Our Mobile Showroom <Arrow /></a></div>
          </Reveal>
        </div>

        <div className="seq">
          {SEQ.map(([id, n, cap], i) => (
            <figure key={id}>
              <ClipReveal from="bottom" parallax={20 + i * 14}><ImageSlot id={id} /></ClipReveal>
              <Reveal delay={0.1}><figcaption><span className="num">{n}</span>{cap}</figcaption></Reveal>
            </figure>
          ))}
        </div>

        <ol className="steps4" style={{ padding: 0 }}>
          {STEPS.map(([t, d], i) => (
            <Reveal as="li" key={t} delay={i * 0.08}>
              <span className="num">0{i + 1}</span>
              <h4>{t}</h4>
              <p>{d}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
