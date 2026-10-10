import { PRICING as DEFAULT } from "../config/pricing.js";

const sqft = (w, h) => (w * h) / 144;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * One project item:
 * { service: "install"|"repair"|"restoration", kind: "window"|"door",
 *   type, material, glass, widthIn, heightIn, qty,
 *   removal, disposal, finishing, issue, condition, restFinish }
 *
 * Returns { lines: [{label, low, high}], low, high, inspection: [reasons] }
 * Items without enough information are flagged for inspection rather than priced.
 */
export function estimateItem(item, P = DEFAULT) {
  const qty = Math.max(1, Math.round(item.qty || 1));
  const s = P.rangeSpread;
  const lines = [];
  const inspection = [];
  const mid = (label, amount) => lines.push({ label, low: amount * (1 - s), high: amount * (1 + s) });
  const range = (label, lo, hi) => lines.push({ label, low: lo, high: hi });
  const hasSize = item.widthIn > 0 && item.heightIn > 0;

  if (item.service === "install") {
    const cfg = P.install[item.kind];
    if (!hasSize) inspection.push("Dimensions needed to price installation");
    else {
      const area = sqft(item.widthIn, item.heightIn);
      const rate = cfg.perSqFt[item.material] ?? Object.values(cfg.perSqFt)[0];
      const typeMult = cfg.types[item.type] ?? 1;
      mid(`Product & installation × ${qty}`, (cfg.base + area * rate * typeMult) * qty);
      const g = P.glass[item.kind]?.[item.glass] ?? 0;
      if (g) mid(`Glass: ${item.glass} × ${qty}`, area * g * qty);
    }
    if (item.removal) mid(`${P.addOns.removal.label} × ${qty}`, P.addOns.removal.perUnit * qty);
    if (item.disposal) mid(`${P.addOns.disposal.label} × ${qty}`, P.addOns.disposal.perUnit * qty);
    const f = P.addOns.finishing.options[item.finishing] ?? 0;
    if (f) mid(`Finishing: ${item.finishing} × ${qty}`, f * qty);
  }

  if (item.service === "repair") {
    const r = P.repair[item.kind].issues[item.issue];
    if (!r) inspection.push("The reported issue needs an in-person look");
    else range(`${item.issue} × ${qty}`, r[0] * qty, r[1] * qty);
  }

  if (item.service === "restoration") {
    const cfg = P.restoration[item.kind];
    const cond = P.restoration.condition[item.condition];
    if (cond == null) inspection.push("Condition unknown — a restoration assessment is recommended");
    else {
      const typical = item.kind === "door" ? 21 : 12;
      const sizeF = hasSize ? clamp(sqft(item.widthIn, item.heightIn) / typical, 0.75, 1.6) : 1;
      range(
        `Restoration (${item.condition.split(" —")[0].toLowerCase()}) × ${qty}`,
        cfg.range[0] * cond * sizeF * qty,
        cfg.range[1] * cond * sizeF * qty,
      );
      if (!hasSize) inspection.push("Size not provided — range assumes a typical opening");
    }
    const f = P.restoration.finishing[item.restFinish] ?? 0;
    if (f) mid(`Finish: ${item.restFinish} × ${qty}`, f * qty);
  }

  const low = lines.reduce((a, l) => a + l.low, 0);
  const high = lines.reduce((a, l) => a + l.high, 0);
  return { lines, low, high, inspection };
}

export function estimateProject(items, P = DEFAULT) {
  const results = items.map((i) => estimateItem(i, P));
  return {
    results,
    low: results.reduce((a, r) => a + r.low, 0),
    high: results.reduce((a, r) => a + r.high, 0),
    needsInspection: results.some((r) => r.inspection.length > 0),
  };
}

/** Round to a friendly number for display. */
export const roundTo = (n, step = 10) => Math.round(n / step) * step;
