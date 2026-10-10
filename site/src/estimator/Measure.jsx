import { useEffect, useRef, useState } from "react";
import Annotator, { CornerGuide } from "./Annotator.jsx";
import { EXAMPLE, EXAMPLE_POINTS, exampleImageUrl } from "./exampleImage.js";
import { measureWithReference, isConvexQuad } from "../lib/geometry.js";
import { fromInches, toInches } from "../lib/units.js";

const REFS = {
  letter: { label: "US Letter paper — 8.5 × 11 in", w: 8.5, h: 11 },
  a4: { label: "A4 paper — 21 × 29.7 cm", w: 21 / 2.54, h: 29.7 / 2.54 },
  custom: { label: "Something else (enter its size)", w: null, h: null },
};

const EDGE_TIPS = {
  window: "Mark the inside edges of the existing window frame — the corners where the frame meets the wall opening — not the glass or the outer trim.",
  door: "Mark the inside edges of the door frame: the top corners beneath the head jamb, and the bottom corners where the jambs meet the threshold or floor.",
};

/** Detects WebXR AR support honestly; this preview does not ship an AR measuring session. */
function useArStatus() {
  const [s, setS] = useState("checking");
  useEffect(() => {
    let live = true;
    if (!navigator.xr?.isSessionSupported) { setS("unsupported"); return; }
    navigator.xr.isSessionSupported("immersive-ar").then((ok) => live && setS(ok ? "supported" : "unsupported")).catch(() => live && setS("unsupported"));
    return () => { live = false; };
  }, []);
  return s;
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res({ src, w: im.naturalWidth || 1200, h: im.naturalHeight || 900 });
    im.onerror = rej;
    im.src = src;
  });
}

export default function Measure({ draft, setDraft, unit, setUnit, onPhoto }) {
  const [method, setMethod] = useState(draft.photo ? "photo" : draft.widthIn ? "manual" : null);
  const [img, setImg] = useState(draft.photo || null); // {src,w,h,isExample}
  const [opening, setOpening] = useState(draft.openingPts || []);
  const [phase, setPhase] = useState(draft.photo ? "choose-scale" : "mark"); // mark | choose-scale | mark-ref | done
  const [refKey, setRefKey] = useState("letter");
  const [custom, setCustom] = useState({ w: "", h: "" });
  const [refPts, setRefPts] = useState([]);
  const [calc, setCalc] = useState(null);
  const [demoRunning, setDemoRunning] = useState(false);
  const ar = useArStatus();
  const fileRef = useRef(null);

  const choose = (m) => {
    setMethod(m);
    setCalc(null);
    if (m === "manual") return;
    setOpening([]); setRefPts([]); setPhase("mark");
    if (m === "upload") { setImg(null); fileRef.current?.click(); }
    if (m === "camera") setImg(null);
    if (m === "example") runExample();
  };

  const runExample = async () => {
    const im = { ...(await loadImage(exampleImageUrl())), isExample: true };
    setImg(im); onPhoto(null);
    setOpening([]); setRefPts([]); setPhase("mark"); setDemoRunning(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
    for (let i = 1; i <= 4; i++) { await wait(550); setOpening(EXAMPLE_POINTS.opening.slice(0, i)); }
    await wait(500); setPhase("mark-ref");
    for (let i = 1; i <= 4; i++) { await wait(450); setRefPts(EXAMPLE_POINTS.reference.slice(0, i)); }
    setDemoRunning(false);
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    try {
      const im = await loadImage(url);
      setImg(im); onPhoto({ file: f, url }); setOpening([]); setRefPts([]); setPhase("mark");
    } catch { alert("That file couldn't be opened as an image. Please try another photo."); }
    e.target.value = "";
  };

  const refSize = refKey === "custom"
    ? { w: toInches(parseFloat(custom.w), unit), h: toInches(parseFloat(custom.h), unit) }
    : REFS[refKey];

  // Compute calibrated dimensions when the reference is fully marked.
  useEffect(() => {
    if (phase !== "mark-ref" || refPts.length !== 4 || opening.length !== 4) { setCalc(null); return; }
    const m = measureWithReference(refPts, refSize.w, refSize.h, opening);
    setCalc(m || { error: true });
    if (m) setDraft((d) => ({ ...d, widthIn: +m.width.toFixed(2), heightIn: +m.height.toFixed(2), measuredBy: img?.isExample ? "example" : "photo-reference" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refPts, opening, phase, refKey, custom.w, custom.h]);

  useEffect(() => { setDraft((d) => ({ ...d, openingPts: opening, photo: img })); }, [opening, img, setDraft]);

  const openingValid = opening.length === 4 && isConvexQuad(opening);

  return (
    <div>
      <div className="method-grid" role="group" aria-label="How would you like to measure?">
        {[
          ["example", "Try an Example", "Watch a guided demonstration"],
          ["camera", "Use Camera", "Take a photo of the opening"],
          ["upload", "Upload Photo", "Use a photo you already have"],
          ["manual", "Enter Measurements", "Type your tape measurements"],
        ].map(([k, t, s]) => (
          <button type="button" key={k} className="choice" aria-pressed={method === k || (k === "upload" && method === "photo" && !img?.isExample)} onClick={() => choose(k)}>
            <b>{t}</b><span>{s}</span>
          </button>
        ))}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      <p className="small muted" style={{ marginTop: 12 }}>
        {ar === "supported"
          ? "Your device reports AR support. Live AR measuring isn't enabled in this preview yet — please use a photo with a reference, or your tape measurements."
          : ar === "unsupported"
            ? "Live AR measuring isn't available on this device or browser. Photo-with-reference and manual entry work everywhere."
            : "Checking for AR support…"}
        {" "}Photos stay on your device unless you choose to attach them to a request.
      </p>

      {method === "camera" && !img && <Camera onCapture={async (url, blob) => { const im = await loadImage(url); setImg(im); onPhoto({ file: blob, url }); setPhase("mark"); }} onFallback={() => fileRef.current?.click()} />}

      {img && (method !== "manual") && (
        <div style={{ marginTop: 28 }}>
          {img.isExample && <p className="demo-flag" style={{ marginBottom: 12 }}>Demonstration — simulated measuring sequence</p>}

          {phase === "mark" || phase === "choose-scale" ? (
            <>
              <h4 className="display h-sm">Mark the four corners of the {draft.kind}</h4>
              <p className="small" style={{ marginTop: 8, maxWidth: "44em" }}>{EDGE_TIPS[draft.kind]} Tap in order:</p>
              <CornerGuide count={opening.length} />
              <Annotator src={img.src} w={img.w} h={img.h} points={opening} onChange={(p) => { setOpening(p); setPhase("mark"); }} />
              {opening.length === 4 && !openingValid && <p className="err" style={{ marginTop: 10 }}>Those corners cross over. Please mark them in order: top-left, top-right, bottom-right, bottom-left.</p>}
              {openingValid && !demoRunning && (
                <div className="notice" style={{ marginTop: 20 }}>
                  <b>How should we size this opening?</b>
                  Four marks on a photo can't tell us real-world size on their own. Choose one:
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                    <button type="button" className="btn btn-sm" onClick={() => { setPhase("mark-ref"); setRefPts([]); }}>Use a reference in the photo</button>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setPhase("done"); setDraft((d) => ({ ...d, measuredBy: "manual" })); }}>I'll enter tape measurements</button>
                  </div>
                </div>
              )}
            </>
          ) : phase === "mark-ref" ? (
            <>
              <h4 className="display h-sm">Mark the reference object</h4>
              <p className="small" style={{ marginTop: 8, maxWidth: "46em" }}>
                For this to work, the reference must lie <b>flat in the same plane</b> as the opening — for example, a sheet of paper taped to the glass. Mark the reference's own four corners in the same order.
              </p>
              <div className="grid3" style={{ marginTop: 16, alignItems: "end" }}>
                <div className="field" style={{ gridColumn: refKey === "custom" ? "span 1" : "1 / -1", maxWidth: refKey === "custom" ? undefined : 420 }}>
                  <label htmlFor="refkind">Reference</label>
                  <select id="refkind" className="input" value={refKey} onChange={(e) => setRefKey(e.target.value)} disabled={img.isExample}>
                    {Object.entries(REFS).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
                  </select>
                </div>
                {refKey === "custom" && <>
                  <div className="field"><label htmlFor="refw">Reference width ({unit})</label><input id="refw" className="input" inputMode="decimal" value={custom.w} onChange={(e) => setCustom((c) => ({ ...c, w: e.target.value }))} /></div>
                  <div className="field"><label htmlFor="refh">Reference height ({unit})</label><input id="refh" className="input" inputMode="decimal" value={custom.h} onChange={(e) => setCustom((c) => ({ ...c, h: e.target.value }))} /></div>
                </>}
              </div>
              <CornerGuide count={refPts.length} />
              <Annotator src={img.src} w={img.w} h={img.h} points={refPts} onChange={setRefPts} ghost={opening} label="reference object" color="#e6dfd3" />
              <div style={{ marginTop: 12 }}>
                <button type="button" className="link" onClick={() => { setPhase("mark"); setRefPts([]); }}>← Back to the opening corners</button>
              </div>
              {calc?.error && <p className="err" style={{ marginTop: 10 }}>We couldn't calculate from those marks. Check the reference size and that its corners are in order.</p>}
              {calc && !calc.error && calc.skew > 0.08 && (
                <p className="notice warn" style={{ marginTop: 14 }}>Opposite edges disagree by about {Math.round(calc.skew * 100)}%. The marks may be off, or the reference may not be flat against the opening. Please check, or enter tape measurements below.</p>
              )}
            </>
          ) : null}
        </div>
      )}

      {(method === "manual" || phase === "done" || calc || (img && phase === "mark-ref")) && (
        <Dims draft={draft} setDraft={setDraft} unit={unit} setUnit={setUnit} calc={calc} isExample={img?.isExample && method !== "manual"} />
      )}
    </div>
  );
}

function Dims({ draft, setDraft, unit, setUnit, calc, isExample }) {
  return (
    <div style={{ marginTop: 32, paddingTop: 26, borderTop: "1px solid var(--line)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <h4 className="display h-sm">Review dimensions</h4>
        <UnitToggle unit={unit} setUnit={setUnit} />
      </div>
      {calc && !calc.error && (
        <p className="small" style={{ marginTop: 8 }}>
          {isExample ? "Demonstration result from the example photo. " : "Calculated from your photo and reference. "}
          Please check against a tape measure and correct if needed.
        </p>
      )}
      <div className="grid3" style={{ marginTop: 18 }}>
        <LenInput label="Width" valueIn={draft.widthIn} unit={unit} onChange={(v) => setDraft((d) => ({ ...d, widthIn: v }))} />
        <LenInput label="Height" valueIn={draft.heightIn} unit={unit} onChange={(v) => setDraft((d) => ({ ...d, heightIn: v }))} />
        <div className="field">
          <label htmlFor="qty">Quantity of this size</label>
          <input id="qty" className="input" type="number" min="1" max="50" value={draft.qty} onChange={(e) => setDraft((d) => ({ ...d, qty: Math.max(1, Math.min(50, parseInt(e.target.value || "1", 10))) }))} />
        </div>
      </div>
      <p className="disclaimer" style={{ marginTop: 18 }}>Approximate measurements. Professional verification required before ordering.</p>
    </div>
  );
}

export function UnitToggle({ unit, setUnit }) {
  return (
    <div className="seg" role="group" aria-label="Units">
      <button type="button" aria-pressed={unit === "in"} onClick={() => setUnit("in")}>Inches</button>
      <button type="button" aria-pressed={unit === "cm"} onClick={() => setUnit("cm")}>Centimeters</button>
    </div>
  );
}

function LenInput({ label, valueIn, unit, onChange }) {
  const id = `len-${label}`;
  const fmt = (v) => (v ? String(+fromInches(v, unit).toFixed(unit === "cm" ? 1 : 2)) : "");
  const [text, setText] = useState(fmt(valueIn));
  const last = useRef({ valueIn, unit });
  useEffect(() => {
    // Re-format when the value changes from outside (calculation) or the unit changes.
    const parsed = toInches(parseFloat(text), unit);
    if (last.current.unit !== unit || Math.abs((parsed || 0) - (valueIn || 0)) > 0.01) setText(fmt(valueIn));
    last.current = { valueIn, unit };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueIn, unit]);
  const n = parseFloat(text);
  const bad = text !== "" && (!(n > 0) || n > (unit === "cm" ? 1000 : 400));
  return (
    <div className="field">
      <label htmlFor={id}>{label} ({unit})</label>
      <input
        id={id} className="input" inputMode="decimal" value={text} aria-invalid={bad}
        onChange={(e) => { setText(e.target.value); const v = parseFloat(e.target.value); onChange(v > 0 ? toInches(v, unit) : 0); }}
      />
      {bad && <span className="err">Please enter a realistic size.</span>}
    </div>
  );
}

function Camera({ onCapture, onFallback }) {
  const vRef = useRef(null);
  const [state, setState] = useState("idle"); // idle | starting | live | denied | unsupported | error
  const streamRef = useRef(null);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setState("unsupported"); return; }
    setState("starting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false });
      streamRef.current = s;
      vRef.current.srcObject = s;
      await vRef.current.play();
      setState("live");
    } catch (e) {
      setState(e?.name === "NotAllowedError" || e?.name === "SecurityError" ? "denied" : e?.name === "NotFoundError" ? "unsupported" : "error");
    }
  };
  const stop = () => streamRef.current?.getTracks().forEach((t) => t.stop());
  useEffect(() => stop, []);

  const capture = () => {
    const v = vRef.current;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    c.toBlob((b) => { stop(); onCapture(URL.createObjectURL(b), b); }, "image/jpeg", 0.9);
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div className="camera-box">
        <video ref={vRef} playsInline muted style={{ display: state === "live" ? "block" : "none" }} />
        {state !== "live" && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--on-dark)", padding: 24, textAlign: "center" }}>
            <div style={{ maxWidth: 440 }}>
              {state === "idle" && <><p>Stand square to the opening, include the whole frame, and keep the phone level. We'll ask for camera access next.</p><button type="button" className="btn btn-light" style={{ marginTop: 18 }} onClick={start}>Allow camera & start</button></>}
              {state === "starting" && <p>Starting camera…</p>}
              {state === "denied" && <><p>Camera access was declined. You can allow it in your browser settings, or continue another way.</p><button type="button" className="btn btn-light" style={{ marginTop: 18 }} onClick={onFallback}>Upload a photo instead</button></>}
              {state === "unsupported" && <><p>A camera isn't available in this browser or device.</p><button type="button" className="btn btn-light" style={{ marginTop: 18 }} onClick={onFallback}>Upload a photo instead</button></>}
              {state === "error" && <><p>The camera couldn't start. Please try again or upload a photo.</p><div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}><button type="button" className="btn btn-light" onClick={start}>Try again</button><button type="button" className="btn btn-outline-light" onClick={onFallback}>Upload a photo</button></div></>}
            </div>
          </div>
        )}
      </div>
      {state === "live" && <div style={{ marginTop: 14, display: "flex", gap: 10 }}><button type="button" className="btn" onClick={capture}>Capture photo</button><button type="button" className="btn btn-ghost" onClick={() => { stop(); setState("idle"); }}>Cancel</button></div>}
    </div>
  );
}

export { REFS, EXAMPLE };
