/* Single-user local state.

   This is the whole "backend": one profile, stored in localStorage on this
   device. There is no server, no account, no other user's data anywhere in
   the app. Clearing site data resets you to a fresh demo. */

import { useSyncExternalStore } from "react";
import { getPrice, priceAt, getToken, getAllStats, isReady } from "./market.js";
import { makeRng, fakeSignature, uid } from "./rng.js";
import { TRADERS } from "./traders.js";

const KEY = "fomo-solo-v2";
const DAY = 24 * 60 * 60 * 1000;

/** A fresh, empty book. Positions get dealt once real prices arrive. */
function seedState() {
  const now = Date.now();
  const rng = makeRng("fomo-seed:" + now);

  return {
    version: 2,
    createdAt: now,
    seeded: false,
    profile: {
      name: "you",
      handle: "solo",
      emoji: "🕶️",
      color: "#5B5BF5",
    },
    cash: 10000,
    positions: {},
    trades: [],
    transfers: [
      { id: uid(), ts: now, type: "deposit", usd: 10000, sig: fakeSignature(rng) },
    ],
    watchlist: [],
    following: TRADERS.filter((t) => t.isFriend).slice(0, 8).map((t) => t.id),
    alerts: [],
    notifications: [],
    settings: {
      sound: true,
      push: false,
      alertActivity: true,
      alertVerified: true,
      alertBigMoves: true,
      bigMovePct: 12,
      hideBalance: false,
    },
    lastFeedScan: Date.now(),
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 2) return seedState();
    // Merge settings so newly added flags get their defaults.
    const fresh = seedState();
    return { ...parsed, settings: { ...fresh.settings, ...(parsed.settings || {}) } };
  } catch {
    return seedState();
  }
}

let state = load();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode — the app still works for this session */
  }
}

function set(updater) {
  state = typeof updater === "function" ? updater(state) : updater;
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getState() {
  return state;
}

export function useStore(selector = (s) => s) {
  return useSyncExternalStore(
    subscribe,
    () => selector(getState()),
    () => selector(getState()),
  );
}

/* ── Portfolio math ─────────────────────────────────────────────── */

export function positionValue(tokenId, pos) {
  return pos.qty * getPrice(tokenId);
}

/** Total equity, unrealised P&L, and per-position rows. */
export function portfolio(s = state) {
  const rows = [];
  let holdings = 0;
  let cost = 0;
  for (const [tokenId, pos] of Object.entries(s.positions)) {
    if (!pos || pos.qty <= 0) continue;
    const token = getToken(tokenId);
    if (!token) continue;
    const price = getPrice(tokenId);
    const value = pos.qty * price;
    const pnl = value - pos.costBasis;
    holdings += value;
    cost += pos.costBasis;
    rows.push({
      tokenId,
      token,
      qty: pos.qty,
      price,
      value,
      costBasis: pos.costBasis,
      avgPrice: pos.costBasis / pos.qty,
      pnl,
      pnlPct: pos.costBasis > 0 ? (pnl / pos.costBasis) * 100 : 0,
      openedAt: pos.openedAt,
      realized: pos.realized || 0,
    });
  }
  rows.sort((a, b) => b.value - a.value);
  const total = holdings + s.cash;
  return {
    rows,
    holdings,
    cash: s.cash,
    total,
    cost,
    pnl: holdings - cost,
    pnlPct: cost > 0 ? ((holdings - cost) / cost) * 100 : 0,
    realized: rows.reduce((a, r) => a + r.realized, 0),
  };
}

/** Portfolio value change over the last 24h, from the same positions. */
export function portfolioChange24h(s = state) {
  const since = Date.now() - DAY;
  let now = 0;
  let then = 0;
  for (const [tokenId, pos] of Object.entries(s.positions)) {
    if (!pos || pos.qty <= 0) continue;
    now += pos.qty * getPrice(tokenId);
    then += pos.qty * priceAt(tokenId, since);
  }
  const diff = now - then;
  return { diff, pct: then > 0 ? (diff / then) * 100 : 0 };
}

/* ── Actions ────────────────────────────────────────────────────── */

/**
 * Deal an opening book once, the first time real prices are available, so the
 * app has something to show. Entry prices are the token's *actual* price on
 * the entry date, so the P&L you see is a real historical result.
 */
export function maybeSeedPortfolio() {
  if (state.seeded || !isReady()) return;
  const universe = getAllStats().filter((c) => c.price > 0);
  if (universe.length < 8) return;

  const rng = makeRng("fomo-book:" + state.createdAt);
  const majors = universe.slice(0, 8);
  const wider = universe.slice(8, 40);
  const picks = [
    { coin: majors[0], usd: 3200, daysAgo: 24 },
    { coin: majors[1], usd: 2400, daysAgo: 18 },
    { coin: majors[Math.floor(rng() * 6) + 2], usd: 1500, daysAgo: 11 },
    { coin: wider[Math.floor(rng() * wider.length)], usd: 900, daysAgo: 6 },
  ].filter((p) => p.coin);

  const positions = {};
  const trades = [];
  let spent = 0;
  for (const p of picks) {
    const openedAt = Date.now() - p.daysAgo * DAY;
    const price = priceAt(p.coin.id, openedAt);
    if (!price) continue;
    const qty = p.usd / price;
    positions[p.coin.id] = { qty, costBasis: p.usd, openedAt, realized: 0 };
    trades.push({
      id: uid(),
      ts: openedAt,
      tokenId: p.coin.id,
      side: "buy",
      usd: p.usd,
      qty,
      price,
      sig: fakeSignature(rng),
    });
    spent += p.usd;
  }
  if (!trades.length) return;

  set((s) => ({
    ...s,
    seeded: true,
    cash: Math.max(0, s.cash - spent),
    positions: { ...positions, ...s.positions },
    trades: [...trades, ...s.trades].sort((a, b) => b.ts - a.ts),
    watchlist: universe.slice(0, 3).map((c) => c.id),
  }));
}

export const actions = {
  deposit(usd) {
    const sig = fakeSignature(makeRng("dep" + Date.now()));
    set((s) => ({
      ...s,
      cash: s.cash + usd,
      transfers: [{ id: uid(), ts: Date.now(), type: "deposit", usd, sig }, ...s.transfers],
    }));
    return sig;
  },

  withdraw(usd) {
    const sig = fakeSignature(makeRng("wd" + Date.now()));
    set((s) => ({
      ...s,
      cash: Math.max(0, s.cash - usd),
      transfers: [{ id: uid(), ts: Date.now(), type: "withdraw", usd, sig }, ...s.transfers],
    }));
    return sig;
  },

  buy(tokenId, usd) {
    const price = getPrice(tokenId);
    if (!price || usd <= 0) return null;
    const qty = usd / price;
    const sig = fakeSignature(makeRng("buy" + tokenId + Date.now()));
    const trade = { id: uid(), ts: Date.now(), tokenId, side: "buy", usd, qty, price, sig };
    set((s) => {
      const prev = s.positions[tokenId] || { qty: 0, costBasis: 0, openedAt: Date.now(), realized: 0 };
      return {
        ...s,
        cash: Math.max(0, s.cash - usd),
        positions: {
          ...s.positions,
          [tokenId]: {
            ...prev,
            qty: prev.qty + qty,
            costBasis: prev.costBasis + usd,
            openedAt: prev.qty > 0 ? prev.openedAt : Date.now(),
          },
        },
        trades: [trade, ...s.trades].slice(0, 400),
      };
    });
    return trade;
  },

  /** Sell a fraction (0–1) of a position; returns the trade with realised P&L. */
  sell(tokenId, fraction) {
    const s0 = state;
    const pos = s0.positions[tokenId];
    if (!pos || pos.qty <= 0) return null;
    const f = Math.min(1, Math.max(0, fraction));
    const price = getPrice(tokenId);
    const qty = pos.qty * f;
    const usd = qty * price;
    const costOut = pos.costBasis * f;
    const realized = usd - costOut;
    const sig = fakeSignature(makeRng("sell" + tokenId + Date.now()));
    const trade = { id: uid(), ts: Date.now(), tokenId, side: "sell", usd, qty, price, sig, realized };
    set((s) => {
      const p = s.positions[tokenId];
      const remainingQty = p.qty - qty;
      const next = { ...s.positions };
      if (remainingQty <= 1e-12) {
        delete next[tokenId];
      } else {
        next[tokenId] = {
          ...p,
          qty: remainingQty,
          costBasis: p.costBasis - costOut,
          realized: (p.realized || 0) + realized,
        };
      }
      return {
        ...s,
        cash: s.cash + usd,
        positions: next,
        trades: [trade, ...s.trades].slice(0, 400),
      };
    });
    return trade;
  },

  toggleWatch(tokenId) {
    set((s) => ({
      ...s,
      watchlist: s.watchlist.includes(tokenId)
        ? s.watchlist.filter((x) => x !== tokenId)
        : [...s.watchlist, tokenId],
    }));
  },

  toggleFollow(traderId) {
    set((s) => ({
      ...s,
      following: s.following.includes(traderId)
        ? s.following.filter((x) => x !== traderId)
        : [...s.following, traderId],
    }));
  },

  addAlert(rule) {
    const full = {
      id: uid(),
      enabled: true,
      repeat: false,
      createdAt: Date.now(),
      lastFired: null,
      ...rule,
    };
    set((s) => ({ ...s, alerts: [full, ...s.alerts] }));
    return full;
  },

  updateAlert(id, patch) {
    set((s) => ({
      ...s,
      alerts: s.alerts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  },

  deleteAlert(id) {
    set((s) => ({ ...s, alerts: s.alerts.filter((a) => a.id !== id) }));
  },

  notify(n) {
    const full = { id: uid(), ts: Date.now(), read: false, ...n };
    set((s) => ({ ...s, notifications: [full, ...s.notifications].slice(0, 200) }));
    return full;
  },

  markAllRead() {
    set((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
  },

  clearNotifications() {
    set((s) => ({ ...s, notifications: [] }));
  },

  setSetting(key, value) {
    set((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
  },

  setProfile(patch) {
    set((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  },

  setLastFeedScan(ts) {
    set((s) => ({ ...s, lastFeedScan: ts }));
  },

  resetDemo() {
    set(seedState());
  },
};
