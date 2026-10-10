import test from "node:test";
import assert from "node:assert/strict";
import { estimateItem, estimateProject } from "./estimate.js";

const base = { kind: "window", type: "double-hung", material: "vinyl", glass: "standard", widthIn: 36, heightIn: 48, qty: 2, finishing: "none" };

test("install estimate scales with size and quantity", () => {
  const one = estimateItem({ ...base, service: "install", qty: 1 });
  const two = estimateItem({ ...base, service: "install", qty: 2 });
  assert.ok(one.low > 0 && one.high > one.low);
  assert.ok(Math.abs(two.high - 2 * one.high) < 1e-6);
  // 12 sq ft * 38 + 250 = 706 midpoint
  assert.ok(Math.abs((one.low + one.high) / 2 - 706) < 1e-6);
});

test("install without dimensions asks for inspection", () => {
  const r = estimateItem({ ...base, service: "install", widthIn: 0 });
  assert.equal(r.lines.length, 0);
  assert.ok(r.inspection.length);
});

test("unknown repair issue is not priced", () => {
  const r = estimateItem({ ...base, service: "repair", issue: "Something else / not sure" });
  assert.equal(r.high, 0);
  assert.ok(r.inspection.length);
});

test("restoration condition affects price; unknown condition → assessment", () => {
  const good = estimateItem({ ...base, service: "restoration", condition: "Good — mostly cosmetic" });
  const poor = estimateItem({ ...base, service: "restoration", condition: "Poor — significant deterioration" });
  assert.ok(poor.high > good.high);
  const unk = estimateProject([{ ...base, service: "restoration", condition: "Not sure" }]);
  assert.equal(unk.needsInspection, true);
});
