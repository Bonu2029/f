/* Fictional traders.

   The market data in this app is real; the *people* are not. fomo's social
   layer is other users' private trading activity, which has no public API and
   is not mine to copy — so the feed and leaderboard are populated by invented
   traders instead. Their holdings are real tokens and their P&L is computed
   from real price history, but no real person appears anywhere in this app.

   This is the one place where the app is deliberately not live data, and the
   UI labels it as such. */

import { makeRng, pick, range, intRange, hashString } from "./rng.js";
import { getPrice, priceAt, getAllStats } from "./market.js";

const NAMES = [
  ["nightowl", "nightowl", "🦉", "#6366F1"],
  ["gm_gremlin", "gmgremlin", "👹", "#EF4444"],
  ["saltyexits", "saltyexits", "🧂", "#F59E0B"],
  ["bagholder", "bagholder99", "🎒", "#8B5CF6"],
  ["chartmommy", "chartmommy", "📈", "#EC4899"],
  ["liquidity", "liquiditygod", "💧", "#06B6D4"],
  ["rugsurvivor", "rugsurvivor", "🪤", "#84CC16"],
  ["degenmode", "degenmode", "🎲", "#F97316"],
  ["quietcapital", "quietcapital", "🤫", "#64748B"],
  ["moonfarmer", "moonfarmer", "🌾", "#22C55E"],
  ["exitliquid", "exitliquidity", "🚪", "#A855F7"],
  ["copytrader", "copythat", "📋", "#3B82F6"],
  ["sizebet", "sizebet", "🐋", "#0EA5E9"],
  ["frogpilled", "frogpilled", "🐸", "#4ADE80"],
  ["latenight", "latenightbid", "🌙", "#818CF8"],
  ["ohnoanotherone", "ohnoanother", "😵", "#FB7185"],
  ["softfloor", "softfloor", "🧊", "#38BDF8"],
  ["greenwick", "greenwick", "🕯️", "#10B981"],
  ["tinyalpha", "tinyalpha", "🐜", "#D946EF"],
  ["hodlplease", "hodlplease", "🙏", "#FACC15"],
  ["marketmaker", "mmandy", "⚙️", "#94A3B8"],
  ["fivexonly", "fivexonly", "5️⃣", "#F43F5E"],
  ["sniperbot", "sniperbot", "🎯", "#DC2626"],
  ["chillpilled", "chillpilled", "🧘", "#7DD3FC"],
  ["upOnly", "uponlyplz", "🚀", "#FB923C"],
  ["paperhands", "paperhandz", "🧻", "#CBD5E1"],
];

export const TRADERS = NAMES.map(([name, handle, emoji, color], i) => {
  const rng = makeRng("fomo-trader:" + handle);
  return {
    id: "t" + i,
    name,
    handle,
    emoji,
    color,
    isFriend: rng() < 0.42,
    followers: Math.round(range(rng, 300, 90000)),
    winRate: Math.round(range(rng, 38, 79)),
    scale: range(rng, 0.4, 6.5),
    positions: [],
  };
});

export const TRADER_BY_ID = Object.fromEntries(TRADERS.map((t) => [t.id, t]));

let builtFor = 0;

/**
 * Give each trader a book once real tokens are loaded. Deterministic per
 * handle, so a trader's positions stay put across reloads.
 */
export function ensureTraderBooks() {
  const universe = getAllStats().filter((c) => c.price > 0);
  if (universe.length < 10 || builtFor === universe.length) return;
  builtFor = universe.length;

  for (const t of TRADERS) {
    const rng = makeRng("fomo-book:" + t.handle);
    const n = intRange(rng, 2, 5);
    const used = new Set();
    const positions = [];
    for (let k = 0; k < n; k++) {
      let coin = pick(rng, universe);
      let guard = 0;
      while (used.has(coin.id) && guard++ < 12) coin = pick(rng, universe);
      used.add(coin.id);
      const daysAgo = range(rng, 1, 25);
      positions.push({
        tokenId: coin.id,
        usdAtEntry: t.scale * range(rng, 4000, 90000),
        openedAt: Date.now() - daysAgo * 24 * 60 * 60 * 1000,
      });
    }
    t.positions = positions;
  }
}

const WINDOW_MS = { "24h": 864e5, "7d": 6048e5, "30d": 2592e6 };

/** P&L over a window, from real price history. */
export function traderPnl(trader, window = "24h") {
  const ms = WINDOW_MS[window] || WINDOW_MS["24h"];
  const since = Date.now() - ms;
  let pnl = 0;
  let value = 0;
  for (const p of trader.positions) {
    const entry = priceAt(p.tokenId, p.openedAt);
    if (!entry) continue;
    const qty = p.usdAtEntry / entry;
    const cur = getPrice(p.tokenId);
    value += qty * cur;
    const from = Math.max(since, p.openedAt);
    pnl += qty * (cur - priceAt(p.tokenId, from));
  }
  return { pnl, value };
}

export function getLeaderboard(window = "24h") {
  ensureTraderBooks();
  return TRADERS.map((t) => {
    const { pnl, value } = traderPnl(t, window);
    return {
      trader: t,
      pnl,
      value,
      pct: value - pnl > 0 ? (pnl / (value - pnl)) * 100 : 0,
      topTokens: t.positions.slice(0, 3).map((p) => p.tokenId),
    };
  }).sort((a, b) => b.pnl - a.pnl);
}

export function getFriends() {
  return TRADERS.filter((t) => t.isFriend);
}

/* ── Activity feed ────────────────────────────────────────────────
   Events sit on a deterministic time grid so the feed fills in as real time
   passes and replays identically on reload. The tokens they reference — and
   the prices shown on each card — are live. */

const SLOT_MS = 6 * 60 * 1000;
const FEED_EPOCH = Date.UTC(2026, 0, 1);

function slotEvent(slot, universe) {
  const rng = makeRng("fomo-feed:" + slot);
  if (rng() > 0.62 || !universe.length) return null;

  const trader = TRADERS[Math.floor(rng() * TRADERS.length)];
  const coin = universe[Math.floor(rng() * universe.length)];
  const roll = rng();

  let type;
  if (roll < 0.42) type = "open";
  else if (roll < 0.62) type = "close";
  else if (roll < 0.74) type = "add";
  else if (roll < 0.88) type = "move";
  else type = "crowd";

  const ts = FEED_EPOCH + slot * SLOT_MS;
  return {
    id: `ev${slot}`,
    slot,
    ts,
    type,
    traderId: trader.id,
    tokenId: coin.id,
    usd: range(rng, 2400, 180000),
    openedAt: ts - range(rng, 6, 96) * 60 * 60 * 1000,
    crowdCount: intRange(rng, 6, 42),
    crowdIds: [0, 1, 2].map(() => TRADERS[Math.floor(rng() * TRADERS.length)].id),
    reactions: intRange(rng, 3, 340),
    comments: intRange(rng, 0, 48),
  };
}

export function getFeed({ hours = 48, following = null, limit = 60 } = {}) {
  ensureTraderBooks();
  const universe = getAllStats().filter((c) => c.price > 0);
  const now = Date.now();
  const endSlot = Math.floor((now - FEED_EPOCH) / SLOT_MS);
  const startSlot = Math.max(0, endSlot - Math.ceil((hours * 3600000) / SLOT_MS));
  const out = [];
  for (let slot = endSlot; slot >= startSlot && out.length < limit; slot--) {
    const ev = slotEvent(slot, universe);
    if (!ev) continue;
    if (following && ev.type !== "move" && !following.includes(ev.traderId)) continue;
    out.push(ev);
  }
  return out;
}

export function getFeedSince(sinceTs) {
  const universe = getAllStats().filter((c) => c.price > 0);
  const now = Date.now();
  const endSlot = Math.floor((now - FEED_EPOCH) / SLOT_MS);
  const startSlot = Math.max(0, Math.floor((sinceTs - FEED_EPOCH) / SLOT_MS) + 1);
  const out = [];
  for (let slot = startSlot; slot <= endSlot; slot++) {
    const ev = slotEvent(slot, universe);
    if (ev) out.push(ev);
  }
  return out;
}

export function getTopTrades(n = 6) {
  return getLeaderboard("24h")
    .slice(0, n)
    .map((row) => ({ trader: row.trader, tokenId: row.topTokens[0], pnl: row.pnl }));
}

export { hashString };
