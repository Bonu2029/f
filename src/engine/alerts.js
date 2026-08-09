/* Alert engine.

   Runs on every market tick. Two sources of alerts:
     1. Rules you create yourself (price targets, % moves, position P&L).
     2. Ambient watchers driven by Settings (trader activity you follow,
        verified-token moves, big swings on things you hold or watch).

   Everything fires locally: in-app notification centre, a toast, an optional
   sound, and — if you grant permission — a real OS notification. */

import { getPrice, getStats, changePct, getAllStats } from "./market.js";
import { getToken } from "./tokens.js";
import { getFeedSince, TRADER_BY_ID } from "./traders.js";
import { getState, actions, portfolio } from "./store.js";
import { fmtPrice, fmtPct, fmtUsd } from "./format.js";

export const ALERT_TYPES = {
  price_above: { label: "rises above", long: "Price rises above", unit: "$" },
  price_below: { label: "drops below", long: "Price drops below", unit: "$" },
  pct_up_24h: { label: "up 24h", long: "Up more than (24h)", unit: "%" },
  pct_down_24h: { label: "down 24h", long: "Down more than (24h)", unit: "%" },
  pct_up_1h: { label: "up 1h", long: "Up more than (1h)", unit: "%" },
  pct_down_1h: { label: "down 1h", long: "Down more than (1h)", unit: "%" },
  position_gain: { label: "my position up", long: "My position is up", unit: "%" },
  position_loss: { label: "my position down", long: "My position is down", unit: "%" },
};

/** Minimum gap between repeats of the same rule. */
const REPEAT_COOLDOWN = 10 * 60 * 1000;
const AMBIENT_COOLDOWN = 30 * 60 * 1000;

const ambientLast = new Map();

function cooled(key, ms) {
  const last = ambientLast.get(key) || 0;
  if (Date.now() - last < ms) return false;
  ambientLast.set(key, Date.now());
  return true;
}

function ruleSatisfied(rule, s) {
  const price = getPrice(rule.tokenId);
  if (!price) return null;
  const token = getToken(rule.tokenId);
  if (!token) return null;

  switch (rule.type) {
    case "price_above":
      return price >= rule.value
        ? { title: `${token.symbol} above ${fmtPrice(rule.value)}`, body: `Now ${fmtPrice(price)}`, tone: "up" }
        : null;
    case "price_below":
      return price <= rule.value
        ? { title: `${token.symbol} below ${fmtPrice(rule.value)}`, body: `Now ${fmtPrice(price)}`, tone: "down" }
        : null;
    case "pct_up_24h": {
      const c = changePct(rule.tokenId, "24h");
      return c >= rule.value
        ? { title: `${token.symbol} up ${fmtPct(c)}`, body: `Past 24h · ${fmtPrice(price)}`, tone: "up" }
        : null;
    }
    case "pct_down_24h": {
      const c = changePct(rule.tokenId, "24h");
      return c <= -rule.value
        ? { title: `${token.symbol} down ${fmtPct(c)}`, body: `Past 24h · ${fmtPrice(price)}`, tone: "down" }
        : null;
    }
    case "pct_up_1h": {
      const c = changePct(rule.tokenId, "1h");
      return c >= rule.value
        ? { title: `${token.symbol} up ${fmtPct(c)}`, body: `Past hour · ${fmtPrice(price)}`, tone: "up" }
        : null;
    }
    case "pct_down_1h": {
      const c = changePct(rule.tokenId, "1h");
      return c <= -rule.value
        ? { title: `${token.symbol} down ${fmtPct(c)}`, body: `Past hour · ${fmtPrice(price)}`, tone: "down" }
        : null;
    }
    case "position_gain": {
      const pos = s.positions[rule.tokenId];
      if (!pos || pos.qty <= 0) return null;
      const pnlPct = ((pos.qty * price - pos.costBasis) / pos.costBasis) * 100;
      return pnlPct >= rule.value
        ? {
            title: `Your ${token.symbol} is up ${fmtPct(pnlPct)}`,
            body: `${fmtUsd(pos.qty * price - pos.costBasis, { sign: true })} unrealised`,
            tone: "up",
          }
        : null;
    }
    case "position_loss": {
      const pos = s.positions[rule.tokenId];
      if (!pos || pos.qty <= 0) return null;
      const pnlPct = ((pos.qty * price - pos.costBasis) / pos.costBasis) * 100;
      return pnlPct <= -rule.value
        ? {
            title: `Your ${token.symbol} is down ${fmtPct(pnlPct)}`,
            body: `${fmtUsd(pos.qty * price - pos.costBasis)} unrealised`,
            tone: "down",
          }
        : null;
    }
    default:
      return null;
  }
}

/* ── Output channels ─────────────────────────────────────────────── */

let audioCtx = null;
function beep(tone) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    const base = tone === "down" ? 420 : 660;
    osc.frequency.setValueAtTime(base, t0);
    osc.frequency.exponentialRampToValueAtTime(tone === "down" ? 300 : 990, t0 + 0.12);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.34);
  } catch {
    /* audio blocked until first interaction — not worth surfacing */
  }
}

export async function requestPushPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

function osNotify(n) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    new Notification(n.title, { body: n.body, tag: n.id, icon: "/icon.svg" });
  } catch {
    /* ignore */
  }
}

/** Toast sink — App registers a callback so alerts can slide in on screen. */
let toastSink = null;
export function onToast(fn) {
  toastSink = fn;
  return () => {
    if (toastSink === fn) toastSink = null;
  };
}

function emit(payload) {
  const s = getState();
  const n = actions.notify(payload);
  if (toastSink) toastSink(n);
  if (s.settings.sound) beep(payload.tone);
  if (s.settings.push) osNotify(n);
  return n;
}

/* ── The tick ────────────────────────────────────────────────────── */

export function runAlerts() {
  const s = getState();
  const now = Date.now();

  // 1. User-defined rules.
  for (const rule of s.alerts) {
    if (!rule.enabled) continue;
    if (rule.repeat && rule.lastFired && now - rule.lastFired < REPEAT_COOLDOWN) continue;
    if (!rule.repeat && rule.lastFired) continue;

    const hit = ruleSatisfied(rule, s);
    if (!hit) continue;

    emit({
      kind: "rule",
      ruleId: rule.id,
      tokenId: rule.tokenId,
      title: hit.title,
      body: hit.body,
      tone: hit.tone,
    });
    actions.updateAlert(rule.id, {
      lastFired: now,
      enabled: rule.repeat ? true : false,
    });
  }

  // 2. Ambient: traders you follow.
  if (s.settings.alertActivity) {
    const events = getFeedSince(s.lastFeedScan || now - 60 * 1000);
    if (events.length) actions.setLastFeedScan(now);
    for (const ev of events) {
      if (!s.following.includes(ev.traderId)) continue;
      if (ev.type !== "open" && ev.type !== "close") continue;
      if (!cooled("act:" + ev.traderId, 8 * 60 * 1000)) continue;
      const trader = TRADER_BY_ID[ev.traderId];
      const token = getToken(ev.tokenId);
      if (!trader || !token) continue;
      emit({
        kind: "activity",
        tokenId: ev.tokenId,
        traderId: ev.traderId,
        title: `${trader.name} ${ev.type === "open" ? "bought" : "sold"} ${token.symbol}`,
        body: `${fmtUsd(ev.usd, { compact: true })} position`,
        tone: ev.type === "open" ? "up" : "down",
      });
    }
  } else {
    actions.setLastFeedScan(now);
  }

  // 3. Ambient: big swings on anything you hold or watch.
  if (s.settings.alertBigMoves) {
    const threshold = s.settings.bigMovePct || 12;
    const watched = new Set([...s.watchlist, ...Object.keys(s.positions)]);
    for (const tokenId of watched) {
      const c = changePct(tokenId, "1h");
      if (Math.abs(c) < threshold) continue;
      if (!cooled("move:" + tokenId, AMBIENT_COOLDOWN)) continue;
      const token = getToken(tokenId);
      if (!token) continue;
      emit({
        kind: "move",
        tokenId,
        title: `${token.symbol} ${c > 0 ? "▲" : "▼"} ${fmtPct(c)} in an hour`,
        body: `Now ${fmtPrice(getPrice(tokenId))}`,
        tone: c > 0 ? "up" : "down",
      });
    }
  }

  // 4. Ambient: verified tokens making an outsized daily move.
  if (s.settings.alertVerified) {
    for (const token of getAllStats().slice(0, 40)) {
      const tokenId = token.id;
      const c = changePct(tokenId, "24h");
      if (Math.abs(c) < 20) continue;
      if (!cooled("ver:" + tokenId, 2 * 60 * 60 * 1000)) continue;
      emit({
        kind: "verified",
        tokenId,
        title: `${token.symbol} ${c > 0 ? "up" : "down"} ${fmtPct(c)} today`,
        body: token.name,
        tone: c > 0 ? "up" : "down",
      });
    }
  }
}

/** Convenience used by the token screen's "Alert me" shortcuts. */
export function quickAlert(tokenId, type, value) {
  return actions.addAlert({ tokenId, type, value, repeat: type.startsWith("pct") });
}

export function describeRule(rule) {
  const token = getToken(rule.tokenId);
  const meta = ALERT_TYPES[rule.type];
  if (!token || !meta) return "";
  const val = meta.unit === "$" ? fmtPrice(rule.value) : `${rule.value}%`;
  return `${token.symbol} ${meta.label} ${val}`;
}

export { portfolio, getStats };
