import { useState } from "react";
import { COMPANY, FORMS } from "../config/company.js";
import { submitForm } from "../lib/submit.js";
import FormResult from "../components/FormResult.jsx";
import { Reveal } from "../components/motion.jsx";

const PROJECT_TYPES = ["Window installation / replacement", "Door installation / replacement", "Window repair", "Door repair", "Historic restoration", "Not sure yet"];
const TIMES = ["Weekday morning", "Weekday afternoon", "Weekday evening", "Saturday", "Flexible"];

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const phoneOk = (v) => v.replace(/\D/g, "").length >= 10;

function useForm(initial, validate) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const run = async (e, endpoint) => {
    e.preventDefault();
    const errs = validate(v);
    setErrors(errs);
    if (Object.keys(errs).length) {
      e.target.querySelector(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }
    setBusy(true);
    setResult(await submitForm(endpoint, v));
    setBusy(false);
  };
  return { v, set, errors, busy, result, run };
}

function Field({ label, name, errors, children, hint }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {children}
      {hint && <span className="small muted" id={`${name}-hint`}>{hint}</span>}
      {errors[name] && <span className="err" id={`${name}-err`}>{errors[name]}</span>}
    </div>
  );
}
const aria = (name, errors) => ({ id: name, name, "aria-invalid": !!errors[name], "aria-describedby": errors[name] ? `${name}-err` : undefined });

export default function Forms() {
  const show = useForm(
    { name: "", email: "", phone: "", zip: "", projectType: "", time: "", notes: "" },
    (v) => {
      const e = {};
      if (!v.name.trim()) e.name = "Please enter your name.";
      if (!emailOk(v.email)) e.email = "Please enter a valid email.";
      if (!phoneOk(v.phone)) e.phone = "Please enter a phone number we can reach you on.";
      if (!/^\d{5}$/.test(v.zip.trim())) e.zip = "Please enter a 5-digit ZIP code.";
      if (!v.projectType) e.projectType = "Please choose a project type.";
      if (!v.time) e.time = "Please choose a preferred time.";
      return e;
    },
  );
  const contact = useForm(
    { cname: "", cemail: "", cmessage: "" },
    (v) => {
      const e = {};
      if (!v.cname.trim()) e.cname = "Please enter your name.";
      if (!emailOk(v.cemail)) e.cemail = "Please enter a valid email.";
      if (!v.cmessage.trim()) e.cmessage = "Please add a short message.";
      return e;
    },
  );

  return (
    <section className="section bg-stone" aria-labelledby="forms-h">
      <div className="wrap">
        <Reveal className="sec-head">
          <div>
            <p className="eyebrow">Get in touch</p>
            <h2 className="display h-lg" id="forms-h">Let's talk about <em>your home.</em></h2>
          </div>
          <p className="lede">Request a mobile showroom visit, or send us a quick note. We'll reply to confirm details.</p>
        </Reveal>
        <div className="forms">
          <form className="form-card" id="book" noValidate onSubmit={(e) => show.run(e, FORMS.showroomEndpoint)} aria-labelledby="book-h">
            <h3 id="book-h">Book the mobile showroom</h3>
            <p className="small muted">This is a visit request. Your appointment is confirmed once we contact you.</p>
            <div className="grid2">
              <Field label="Full name" name="name" errors={show.errors}><input className="input" autoComplete="name" {...aria("name", show.errors)} value={show.v.name} onChange={show.set("name")} /></Field>
              <Field label="ZIP code" name="zip" errors={show.errors}><input className="input" inputMode="numeric" autoComplete="postal-code" maxLength={5} {...aria("zip", show.errors)} value={show.v.zip} onChange={show.set("zip")} /></Field>
              <Field label="Email" name="email" errors={show.errors}><input className="input" type="email" autoComplete="email" {...aria("email", show.errors)} value={show.v.email} onChange={show.set("email")} /></Field>
              <Field label="Phone" name="phone" errors={show.errors}><input className="input" type="tel" autoComplete="tel" {...aria("phone", show.errors)} value={show.v.phone} onChange={show.set("phone")} /></Field>
              <Field label="Project type" name="projectType" errors={show.errors}>
                <select className="input" {...aria("projectType", show.errors)} value={show.v.projectType} onChange={show.set("projectType")}>
                  <option value="">Choose…</option>{PROJECT_TYPES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Preferred visit time" name="time" errors={show.errors}>
                <select className="input" {...aria("time", show.errors)} value={show.v.time} onChange={show.set("time")}>
                  <option value="">Choose…</option>{TIMES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Anything we should know? (optional)" name="notes" errors={show.errors}><textarea className="input" {...aria("notes", show.errors)} value={show.v.notes} onChange={show.set("notes")} /></Field>
            <button className="btn" type="submit" disabled={show.busy}>{show.busy ? "Sending…" : "Request a Showroom Visit"}</button>
            <FormResult result={show.result} successText=" Thank you — we'll be in touch to confirm a visit time. Your appointment isn't booked until we confirm it." />
          </form>

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <form className="form-card" id="contact" noValidate onSubmit={(e) => contact.run(e, FORMS.contactEndpoint)} aria-labelledby="contact-h">
              <h3 id="contact-h">Send a message</h3>
              <Field label="Name" name="cname" errors={contact.errors}><input className="input" autoComplete="name" {...aria("cname", contact.errors)} value={contact.v.cname} onChange={contact.set("cname")} /></Field>
              <Field label="Email" name="cemail" errors={contact.errors}><input className="input" type="email" autoComplete="email" {...aria("cemail", contact.errors)} value={contact.v.cemail} onChange={contact.set("cemail")} /></Field>
              <Field label="Message" name="cmessage" errors={contact.errors}><textarea className="input" {...aria("cmessage", contact.errors)} value={contact.v.cmessage} onChange={contact.set("cmessage")} /></Field>
              <button className="btn btn-ghost" type="submit" disabled={contact.busy}>{contact.busy ? "Sending…" : "Send Message"}</button>
              <FormResult result={contact.result} successText=" Thanks — we'll reply soon." />
            </form>
            <div className="small" style={{ display: "grid", gap: 6 }}>
              <span><b>Phone</b> — {COMPANY.phoneHref ? <a href={COMPANY.phoneHref}>{COMPANY.phone}</a> : <span className="ph-txt">{COMPANY.phone}</span>}</span>
              <span><b>Email</b> — {COMPANY.emailHref ? <a href={COMPANY.emailHref}>{COMPANY.email}</a> : <span className="ph-txt">{COMPANY.email}</span>}</span>
              <span><b>Hours</b> — <span className="ph-txt">{COMPANY.hours}</span></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
