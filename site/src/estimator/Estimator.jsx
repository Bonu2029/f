import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Measure, { UnitToggle } from "./Measure.jsx";
import { PRICING } from "../config/pricing.js";
import { FORMS } from "../config/company.js";
import { estimateProject, roundTo } from "../lib/estimate.js";
import { fmtLen, money } from "../lib/units.js";
import { submitForm } from "../lib/submit.js";
import FormResult from "../components/FormResult.jsx";
import { Arrow, EASE, Reveal } from "../components/motion.jsx";

const STEPS = ["Service", "Window or door", "Measure", "Options", "Estimate", "Verify"];

const SERVICE_CHOICES = [
  ["install", "Installation or replacement", "New or replacement windows and doors"],
  ["repair", "Repair", "Fix sticking, drafty, foggy or broken units"],
  ["restoration", "Historic restoration", "Preserve original windows and doors"],
];

const newDraft = (service = null) => ({
  service, kind: null, label: "",
  widthIn: 0, heightIn: 0, qty: 1,
  type: null, material: null, glass: null,
  removal: true, disposal: true, finishing: "trim & caulk",
  issue: null, condition: null, restFinish: "Match existing paint",
  photo: null, openingPts: [], measuredBy: null,
});

function withDefaults(d) {
  if (d.service === "install" && d.kind) {
    const cfg = PRICING.install[d.kind];
    return {
      ...d,
      type: d.type && cfg.types[d.type] ? d.type : Object.keys(cfg.types)[0],
      material: d.material && cfg.perSqFt[d.material] ? d.material : Object.keys(cfg.perSqFt)[0],
      glass: d.glass && PRICING.glass[d.kind][d.glass] != null ? d.glass : Object.keys(PRICING.glass[d.kind])[d.kind === "door" ? 1 : 0],
    };
  }
  if (d.service === "repair" && d.kind) {
    const issues = Object.keys(PRICING.repair[d.kind].issues);
    return { ...d, issue: issues.includes(d.issue) ? d.issue : issues[0] };
  }
  if (d.service === "restoration") {
    return { ...d, condition: d.condition || Object.keys(PRICING.restoration.condition)[1] };
  }
  return d;
}

const itemName = (it, i) =>
  it.label?.trim() ||
  `${it.kind === "door" ? "Door" : "Window"} ${i + 1}`;

export default function Estimator() {
  const [step, setStep] = useState(0);
  const [unit, setUnit] = useState("in");
  const [items, setItems] = useState([]);
  const [draft, setDraftRaw] = useState(newDraft());
  const [editIndex, setEditIndex] = useState(null);
  const [photos, setPhotos] = useState({}); // keyed by "draft" while editing, then by item index
  const topRef = useRef(null);
  const headingRef = useRef(null);

  const setDraft = useCallback((u) => setDraftRaw((d) => (typeof u === "function" ? u(d) : u)), []);

  const go = (n) => {
    setStep(n);
    requestAnimationFrame(() => {
      const top = topRef.current?.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.5) topRef.current?.scrollIntoView({ block: "start" });
      headingRef.current?.focus({ preventScroll: true });
    });
  };

  const commit = () => {
    const d = withDefaults(draft);
    const next = editIndex != null ? items.map((x, i) => (i === editIndex ? d : x)) : [...items, d];
    const idx = editIndex != null ? editIndex : items.length;
    setItems(next);
    if (photos.draft !== undefined) setPhotos((p) => { const { draft: ph, ...rest } = p; return ph ? { ...rest, [idx]: ph } : rest; });
    setEditIndex(null);
    go(4);
  };

  const addAnother = () => { setDraftRaw(newDraft(draft.service)); setEditIndex(null); go(0); };
  const edit = (i) => { setDraftRaw(items[i]); setEditIndex(i); go(2); };
  const remove = (i) => {
    setItems((xs) => xs.filter((_, k) => k !== i));
    setPhotos((p) => {
      const out = {};
      Object.entries(p).forEach(([k, v]) => { if (k === "draft") out.draft = v; else if (+k < i) out[k] = v; else if (+k > i) out[+k - 1] = v; });
      return out;
    });
  };

  const project = useMemo(() => estimateProject(items), [items]);
  const canNext = [
    !!draft.service,
    !!draft.kind,
    draft.service !== "install" || (draft.widthIn > 0 && draft.heightIn > 0),
    true,
  ][step];

  return (
    <section className="section" id="estimate" aria-labelledby="est-h">
      <div className="wrap">
        <div className="sec-head">
          <Reveal>
            <p className="eyebrow">Measure & estimate</p>
            <h2 className="display h-lg" id="est-h">Your project, <em>at a glance.</em></h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lede">A few guided steps to a preliminary price range. You'll see the estimate before we ask for any contact details.</p>
            {PRICING.isDemo && <p style={{ marginTop: 16 }}><span className="demo-flag">Demo pricing — sample rates, not company prices</span></p>}
          </Reveal>
        </div>

        <div className="est" ref={topRef} style={{ scrollMarginTop: "calc(var(--nav-h) + 16px)" }}>
          <div className="est-panel">
            <ol className="progress" aria-label="Progress" style={{ padding: 0 }}>
              {STEPS.map((s, i) => (
                <li key={s} className={i < step ? "done" : i === step ? "cur" : ""} aria-current={i === step ? "step" : undefined}>
                  <i /><span>{i + 1}. {s}</span>
                </li>
              ))}
            </ol>

            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.35, ease: EASE }}>
                {step === 0 && (
                  <>
                    <h3 className="step-title" tabIndex={-1} ref={headingRef}>What can we help with?</h3>
                    <p className="step-sub">Choose the service for this window or door. You can add more items later.</p>
                    <div className="choices" role="group" aria-label="Service">
                      {SERVICE_CHOICES.map(([k, t, s]) => (
                        <button type="button" key={k} className="choice" aria-pressed={draft.service === k} onClick={() => setDraft((d) => withDefaults({ ...d, service: k }))}>
                          <b>{t}</b><span>{s}</span>
                        </button>
                      ))}
                    </div>
                    <p className="small muted" style={{ marginTop: 16 }}>Prefer to see samples first? <a href="#book">Book the mobile showroom</a>.</p>
                  </>
                )}

                {step === 1 && (
                  <>
                    <h3 className="step-title" tabIndex={-1} ref={headingRef}>A window or a door?</h3>
                    <p className="step-sub">Give it a name if you like, so it's easy to find in your project list.</p>
                    <div className="choices" role="group" aria-label="Window or door">
                      {[["window", "Window", "Any style or size"], ["door", "Door", "Entry, patio, French or storm"]].map(([k, t, s]) => (
                        <button type="button" key={k} className="choice" aria-pressed={draft.kind === k} onClick={() => setDraft((d) => withDefaults({ ...d, kind: k }))}>
                          <b>{t}</b><span>{s}</span>
                        </button>
                      ))}
                    </div>
                    <div className="field" style={{ marginTop: 24, maxWidth: 420 }}>
                      <label htmlFor="item-label">Name (optional)</label>
                      <input id="item-label" className="input" placeholder="e.g. Living room front window" value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h3 className="step-title" tabIndex={-1} ref={headingRef}>Measure your {draft.kind}</h3>
                    <p className="step-sub">
                      {draft.service === "install"
                        ? "Choose how you'd like to measure. We'll confirm every dimension in person before anything is ordered."
                        : "Size is optional for repairs and restoration, but it helps us prepare. You can skip this step."}
                    </p>
                    <Measure draft={draft} setDraft={setDraft} unit={unit} setUnit={setUnit} onPhoto={(ph) => setPhotos((p) => ({ ...p, draft: ph }))} />
                  </>
                )}

                {step === 3 && (
                  <>
                    <h3 className="step-title" tabIndex={-1} ref={headingRef}>Project options</h3>
                    <p className="step-sub">Pick what's closest — you can refine everything with us later.</p>
                    <Options draft={withDefaults(draft)} setDraft={setDraft} />
                  </>
                )}

                {step === 4 && (
                  <>
                    <h3 className="step-title" tabIndex={-1} ref={headingRef}>Your preliminary estimate</h3>
                    <EstimateView items={items} project={project} unit={unit} onEdit={edit} onRemove={remove} />
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 28 }}>
                      <button type="button" className="btn" onClick={() => go(5)} disabled={!items.length}>Request Professional Verification <Arrow /></button>
                      <button type="button" className="btn btn-ghost" onClick={addAnother}>Add another window or door</button>
                    </div>
                  </>
                )}

                {step === 5 && (
                  <>
                    <h3 className="step-title" tabIndex={-1} ref={headingRef}>Request professional verification</h3>
                    <p className="step-sub">We'll review your project, confirm measurements, and arrange an inspection or showroom visit. This is a request — nothing is booked until we confirm with you.</p>
                    <VerifyForm items={items} project={project} unit={unit} photos={photos} />
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {step < 4 && (
              <div className="est-nav">
                <button type="button" className="btn btn-ghost" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0}>Back</button>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {step === 2 && draft.service !== "install" && (
                    <button type="button" className="btn btn-ghost" onClick={() => go(3)}>Skip measuring</button>
                  )}
                  {step < 3 && <button type="button" className="btn" disabled={!canNext} onClick={() => go(step + 1)}>Continue <Arrow /></button>}
                  {step === 3 && <button type="button" className="btn" onClick={commit}>See my estimate <Arrow /></button>}
                </div>
              </div>
            )}
            {step === 2 && !canNext && <p className="small muted" style={{ marginTop: 12, textAlign: "right" }}>Enter a width and height to continue.</p>}
            {step === 5 && <div className="est-nav"><button type="button" className="btn btn-ghost" onClick={() => go(4)}>Back to estimate</button></div>}
          </div>

          <aside className="est-side" aria-label="Project summary">
            <div className="box">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span className="small" style={{ fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", fontSize: 11 }}>Project</span>
                <UnitToggle unit={unit} setUnit={setUnit} />
              </div>
              {items.length === 0 ? <p className="small muted">No items yet. Your windows and doors will appear here.</p> : (
                <ul className="item-list">
                  {items.map((it, i) => (
                    <li key={i}>
                      <span><b>{itemName(it, i)}</b><br /><span className="muted">{PRICING.services[it.service].label} · {it.widthIn ? `${fmtLen(it.widthIn, unit)} × ${fmtLen(it.heightIn, unit)}` : "size TBC"} · ×{it.qty}</span></span>
                      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                        <button type="button" onClick={() => edit(i)}>Edit</button>
                        <button type="button" onClick={() => remove(i)}>Remove</button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {items.length > 0 && project.high > 0 && (
                <div style={{ marginTop: 14 }}>
                  <span className="small muted">Preliminary range</span>
                  <div className="display" style={{ fontSize: 30 }}>{money(roundTo(project.low))} – {money(roundTo(project.high))}</div>
                </div>
              )}
            </div>
            <p className="disclaimer">Approximate measurements. Professional verification required before ordering.</p>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Select({ label, id, value, options, onChange }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o[0].toUpperCase() + o.slice(1)}</option>)}
      </select>
    </div>
  );
}

function Options({ draft, setDraft }) {
  const set = (k) => (v) => setDraft((d) => ({ ...withDefaults(d), [k]: v }));
  const qty = (
    <div className="field">
      <label htmlFor="opt-qty">Quantity</label>
      <input id="opt-qty" className="input" type="number" min="1" max="50" value={draft.qty} onChange={(e) => set("qty")(Math.max(1, Math.min(50, parseInt(e.target.value || "1", 10))))} />
    </div>
  );

  if (draft.service === "install") {
    const cfg = PRICING.install[draft.kind];
    return (
      <div style={{ display: "grid", gap: 22 }}>
        <div className="grid2">
          <Select label={`${draft.kind === "door" ? "Door" : "Window"} type`} id="opt-type" value={draft.type} options={Object.keys(cfg.types)} onChange={set("type")} />
          <Select label="Material" id="opt-mat" value={draft.material} options={Object.keys(cfg.perSqFt)} onChange={set("material")} />
          <Select label="Glass" id="opt-glass" value={draft.glass} options={Object.keys(PRICING.glass[draft.kind])} onChange={set("glass")} />
          <Select label="Finishing" id="opt-fin" value={draft.finishing} options={Object.keys(PRICING.addOns.finishing.options)} onChange={set("finishing")} />
          {qty}
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <label className="check"><input type="checkbox" checked={draft.removal} onChange={(e) => set("removal")(e.target.checked)} /> {PRICING.addOns.removal.label}</label>
          <label className="check"><input type="checkbox" checked={draft.disposal} onChange={(e) => set("disposal")(e.target.checked)} /> {PRICING.addOns.disposal.label}</label>
        </div>
      </div>
    );
  }
  if (draft.service === "repair") {
    return (
      <div className="grid2">
        <Select label="What's the issue?" id="opt-issue" value={draft.issue} options={Object.keys(PRICING.repair[draft.kind].issues)} onChange={set("issue")} />
        {qty}
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="opt-notes">Describe it briefly (optional)</label>
          <textarea id="opt-notes" className="input" value={draft.notes || ""} onChange={(e) => set("notes")(e.target.value)} />
        </div>
      </div>
    );
  }
  return (
    <div className="grid2">
      <Select label="Current condition" id="opt-cond" value={draft.condition} options={Object.keys(PRICING.restoration.condition)} onChange={set("condition")} />
      <Select label="Finish" id="opt-rfin" value={draft.restFinish} options={Object.keys(PRICING.restoration.finishing)} onChange={set("restFinish")} />
      {qty}
      <p className="small muted" style={{ gridColumn: "1 / -1" }}>Not every historic window or door can be restored. We'll confirm what's possible during an assessment.</p>
    </div>
  );
}

function EstimateView({ items, project, unit, onEdit, onRemove }) {
  if (!items.length) return <p className="step-sub">Add a window or door to see an estimate.</p>;
  const priced = project.high > 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
        <div>
          <span className="small muted">Estimated range{project.needsInspection && priced ? " (priced items only)" : ""}</span>
          <div className="est-total" aria-live="polite">{priced ? `${money(roundTo(project.low))} – ${money(roundTo(project.high))}` : "Inspection recommended"}</div>
        </div>
        {PRICING.isDemo && <span className="demo-flag">Demo pricing</span>}
      </div>
      <p className="disclaimer" style={{ marginTop: 18 }}>Preliminary estimate. Final pricing requires inspection and confirmed measurements.</p>

      <table className="breakdown">
        <thead><tr><th>Breakdown</th><th className="r">Range</th></tr></thead>
        <tbody>
          {items.map((it, i) => {
            const r = project.results[i];
            return [
              <tr className="item-h" key={`h${i}`}>
                <td>
                  {itemName(it, i)} — {PRICING.services[it.service].label.toLowerCase()} · {it.widthIn ? `${fmtLen(it.widthIn, unit)} × ${fmtLen(it.heightIn, unit)}` : "size to be confirmed"}
                  {it.measuredBy === "example" && <span className="demo-flag" style={{ marginLeft: 8, fontSize: 9 }}>Example dimensions</span>}
                  <span style={{ marginLeft: 10, fontWeight: 400 }}>
                    <button type="button" className="link" style={{ fontSize: 11, padding: 0 }} onClick={() => onEdit(i)}>Edit</button>{" "}
                    <button type="button" className="link" style={{ fontSize: 11, padding: 0, marginLeft: 8 }} onClick={() => onRemove(i)}>Remove</button>
                  </span>
                </td>
                <td className="r">{r.high ? `${money(roundTo(r.low))} – ${money(roundTo(r.high))}` : "—"}</td>
              </tr>,
              ...r.lines.map((l, k) => (
                <tr key={`${i}-${k}`}><td className="muted" style={{ paddingLeft: 14 }}>{l.label}</td><td className="r muted">{money(roundTo(l.low))} – {money(roundTo(l.high))}</td></tr>
              )),
              ...r.inspection.map((m, k) => (
                <tr key={`${i}-i${k}`}><td colSpan={2} style={{ paddingLeft: 14 }}><b>Inspection recommended:</b> {m}.</td></tr>
              )),
            ];
          })}
        </tbody>
      </table>
      {project.needsInspection && (
        <div className="notice warn" style={{ marginTop: 20 }}>
          <b>Some items need a closer look.</b>
          We don't have enough information to price everything online. Request verification and we'll arrange an inspection{items.some((x) => x.service === "restoration") ? " or restoration assessment" : ""}.
        </div>
      )}
    </div>
  );
}

function VerifyForm({ items, project, unit, photos }) {
  const [v, setV] = useState({ name: "", email: "", phone: "", zip: "", contactTime: "", notes: "", attachPhotos: false });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const photoList = Object.entries(photos).filter(([k, p]) => k !== "draft" && p?.file);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!v.name.trim()) er.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) er.email = "Please enter a valid email.";
    if (v.phone && v.phone.replace(/\D/g, "").length < 10) er.phone = "Please check your phone number.";
    if (!/^\d{5}$/.test(v.zip.trim())) er.zip = "Please enter a 5-digit ZIP code.";
    setErrors(er);
    if (Object.keys(er).length) { e.target.querySelector(`[name="${Object.keys(er)[0]}"]`)?.focus(); return; }
    setBusy(true);
    const summary = items.map((it, i) => {
      const r = project.results[i];
      return `${itemName(it, i)}: ${it.service}/${it.kind}, ${it.widthIn ? `${fmtLen(it.widthIn, unit)} x ${fmtLen(it.heightIn, unit)}` : "size TBC"}, qty ${it.qty}, measured by ${it.measuredBy || "n/a"}, est ${r.high ? `${money(roundTo(r.low))}-${money(roundTo(r.high))}` : "inspection"}`;
    }).join("\n");
    const payload = { ...v, project: summary, estimateRange: `${money(roundTo(project.low))}-${money(roundTo(project.high))}`, demoPricing: String(PRICING.isDemo) };
    if (v.attachPhotos) payload.photos = photoList.map(([, p]) => p.file);
    else delete payload.attachPhotos;
    setResult(await submitForm(FORMS.estimateEndpoint, payload));
    setBusy(false);
  };

  const f = (name, label, props = {}) => (
    <div className="field">
      <label htmlFor={`v-${name}`}>{label}</label>
      <input id={`v-${name}`} name={name} className="input" value={v[name]} onChange={set(name)} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `v-${name}-err` : undefined} {...props} />
      {errors[name] && <span className="err" id={`v-${name}-err`}>{errors[name]}</span>}
    </div>
  );

  return (
    <form noValidate onSubmit={submit} style={{ display: "grid", gap: 18 }}>
      <div className="grid2">
        {f("name", "Full name", { autoComplete: "name" })}
        {f("email", "Email", { type: "email", autoComplete: "email" })}
        {f("phone", "Phone (optional)", { type: "tel", autoComplete: "tel" })}
        {f("zip", "ZIP code", { inputMode: "numeric", maxLength: 5, autoComplete: "postal-code" })}
        <div className="field">
          <label htmlFor="v-contactTime">Best time to reach you</label>
          <select id="v-contactTime" className="input" value={v.contactTime} onChange={set("contactTime")}>
            <option value="">No preference</option><option>Morning</option><option>Afternoon</option><option>Evening</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="v-notes">Notes (optional)</label>
        <textarea id="v-notes" className="input" value={v.notes} onChange={set("notes")} />
      </div>
      {photoList.length > 0 && (
        <label className="check">
          <input type="checkbox" checked={v.attachPhotos} onChange={set("attachPhotos")} />
          <span>Yes, include my {photoList.length} photo{photoList.length > 1 ? "s" : ""} with this request. <span className="muted">Photos are only uploaded if you tick this box.</span></span>
        </label>
      )}
      <p className="disclaimer">Preliminary estimate. Final pricing requires inspection and confirmed measurements.</p>
      <div><button className="btn" type="submit" disabled={busy}>{busy ? "Sending…" : "Send for Verification"}</button></div>
      <FormResult result={result} successText=" Thank you — we'll review your project and contact you to confirm measurements and next steps." />
    </form>
  );
}
