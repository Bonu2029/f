import { COMPANY } from "../config/company.js";
import { Reveal } from "../components/motion.jsx";

const FAQ = [
  ["How accurate is the online estimate?", "It's a preliminary range based on the measurements and options you enter. Final pricing requires an inspection and confirmed measurements by our team before anything is ordered."],
  ["Can I measure my windows with my phone?", "You can mark the corners of a window or door on a photo to keep track of each opening. To turn a photo into dimensions, place a known-size reference — such as a sheet of letter paper — flat against the glass and mark it too. Otherwise, measure with a tape and enter the numbers. Either way, we verify everything in person."],
  ["Can my old windows be restored instead of replaced?", "Often, yes — but not always. It depends on the condition of the wood, glass and frame. We'll assess them honestly and explain your options, including when restoration or repair is the better value."],
  ["What happens during a mobile showroom visit?", "You request a visit, we bring physical samples to your home, we discuss your openings and priorities together, and then we send you a proposal. Submitting the form is a request — your appointment is confirmed when we contact you."],
  ["Do you remove and dispose of old windows and doors?", "Removal and disposal can be included in your project. You can add them as options in the estimator to see how they affect your range."],
  ["Which areas do you serve?", `We serve Philadelphia and New Jersey. See the service-area list on this page, or contact ${COMPANY.name} to confirm your town.`],
  ["Are you licensed? What warranties do you offer?", `Yes — ${COMPANY.name} is fully licensed. Ask us about warranty details for your specific project.`],
];

export default function Faq() {
  return (
    <section className="section bg-paper" id="faq" aria-labelledby="faq-h">
      <div className="wrap faq-grid">
        <div>
          <Reveal>
            <p className="eyebrow">Questions</p>
            <h2 className="display h-lg" id="faq-h" style={{ marginTop: 20 }}>Good to <em>know.</em></h2>
          </Reveal>
          <Reveal delay={0.1} id="areas">
            <h3 className="display h-sm" style={{ marginTop: 56 }}>Service areas</h3>
            <div className="areas">
              {Object.entries(COMPANY.serviceAreas).map(([st, towns]) => (
                <div key={st}><h4>{st}</h4><ul>{towns.map((t) => <li key={t}>{t}</li>)}</ul></div>
              ))}
            </div>
          </Reveal>
        </div>
        <Reveal className="faq" delay={0.1}>
          {FAQ.map(([q, a]) => (
            <details key={q}><summary>{q}</summary><p>{a}</p></details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
