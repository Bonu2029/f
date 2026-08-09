/* Live market data.

   Every price, market cap, 24h change and chart in this app comes from
   CoinGecko's public API. Nothing here is simulated: if the network is
   unavailable the app shows the last values it received and says so, rather
   than inventing numbers. */

import { fetchMarkets, fetchTrending, fetchChart, fetchCoin, status } from "./api.js";

const REFRESH_MS = 60000;
const TRENDING_MS = 300000;

/** id -> normalised coin record. */
const coins = new Map();
let order = []; // ids by market cap
let memeIds = [];
let trendingIds = [];

let lastMarkets = 0;
let lastTrending = 0;
let lastMemes = 0;
let ready = false;
let loading = false;

const listeners = new Set();
export function onMarket(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  listeners.forEach((l) => l());
}

export function isReady() {
  return ready;
}
export function isLoading() {
  return loading;
}
export function marketStatus() {
  return status;
}

/** Deterministic accent colour per coin, used behind logos while they load. */
function colorFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 62% 46%)`;
}

function normalise(c, { meme = false } = {}) {
  const prev = coins.get(c.id);
  const rec = {
    id: c.id,
    symbol: (c.symbol || "").toUpperCase(),
    name: c.name,
    image: c.image || c.large || c.thumb || null,
    color: prev?.color || colorFor(c.id),
    price: c.current_price ?? prev?.price ?? 0,
    mc: c.market_cap ?? prev?.mc ?? 0,
    rank: c.market_cap_rank ?? prev?.rank ?? 9999,
    vol24: c.total_volume ?? prev?.vol24 ?? 0,
    high24: c.high_24h ?? prev?.high24 ?? 0,
    low24: c.low_24h ?? prev?.low24 ?? 0,
    change1h: c.price_change_percentage_1h_in_currency ?? prev?.change1h ?? 0,
    change24h:
      c.price_change_percentage_24h_in_currency ??
      c.price_change_percentage_24h ??
      prev?.change24h ??
      0,
    change7d: c.price_change_percentage_7d_in_currency ?? prev?.change7d ?? 0,
    change30d: c.price_change_percentage_30d_in_currency ?? prev?.change30d ?? 0,
    sparkline: c.sparkline_in_7d?.price || prev?.sparkline || null,
    supply: c.circulating_supply ?? prev?.supply ?? 0,
    ath: c.ath ?? prev?.ath ?? 0,
    athDate: c.ath_date ?? prev?.athDate ?? null,
    meme: meme || prev?.meme || false,
    chain: prev?.chain || null,
    updatedAt: c.last_updated ? Date.parse(c.last_updated) : Date.now(),
    // `verified` mirrors the app's blue check: we treat a top-100 market cap
    // as the equivalent signal, since that ranking is objective.
    verified: (c.market_cap_rank ?? 9999) <= 100,
  };

  // A coin record is also its own "stat" row. Non-enumerable aliases keep the
  // screens' field names working without duplicating state or creating a
  // cycle that JSON.stringify would trip over.
  Object.defineProperties(rec, {
    token: { get: () => rec },
    vol24h: { get: () => rec.vol24 },
    high24h: { get: () => rec.high24 },
    low24h: { get: () => rec.low24 },
  });
  return rec;
}

/** Pull the top-100 board, the meme board and the trending list. */
export async function refresh({ force = false } = {}) {
  const now = Date.now();
  if (loading) return;
  if (!force && now - lastMarkets < REFRESH_MS) return;

  loading = true;
  emit();
  try {
    const markets = await fetchMarkets({ perPage: 100 });
    if (Array.isArray(markets)) {
      for (const c of markets) coins.set(c.id, normalise(c));
      order = markets.map((c) => c.id);
      lastMarkets = now;
      ready = true;
    }

    // Meme board — the closest real analogue to the app's "graduated" tab.
    if (now - lastMemes > TRENDING_MS) {
      try {
        const memes = await fetchMarkets({ perPage: 50, category: "meme-token" });
        if (Array.isArray(memes)) {
          for (const c of memes) coins.set(c.id, normalise(c, { meme: true }));
          memeIds = memes.map((c) => c.id);
          lastMemes = now;
        }
      } catch {
        /* optional board — keep whatever we had */
      }
    }

    if (now - lastTrending > TRENDING_MS) {
      try {
        const t = await fetchTrending();
        const items = (t?.coins || []).map((x) => x.item).filter(Boolean);
        for (const item of items) {
          if (!coins.get(item.id)) {
            coins.set(
              item.id,
              normalise({
                id: item.id,
                symbol: item.symbol,
                name: item.name,
                image: item.large || item.small || item.thumb,
                market_cap_rank: item.market_cap_rank,
                current_price: item.data?.price,
                market_cap: Number(String(item.data?.market_cap || "0").replace(/[$,]/g, "")) || 0,
                total_volume:
                  Number(String(item.data?.total_volume || "0").replace(/[$,]/g, "")) || 0,
                price_change_percentage_24h: item.data?.price_change_percentage_24h?.usd,
              }),
            );
          }
        }
        trendingIds = items.map((i) => i.id);
        lastTrending = now;
      } catch {
        /* optional */
      }
    }
  } catch {
    /* api.js already recorded the status; keep serving what we have */
  } finally {
    loading = false;
    emit();
  }
}

/* ── Reads (synchronous, from the last snapshot) ─────────────────── */

export function getToken(id) {
  return coins.get(id) || null;
}

export function getStats(id) {
  return coins.get(id) || null;
}

export function getPrice(id) {
  return coins.get(id)?.price || 0;
}

export function getAllStats() {
  return order.map((id) => coins.get(id)).filter(Boolean);
}

export function getAllIds() {
  return [...new Set([...order, ...memeIds, ...trendingIds])];
}

export function getVerified() {
  return getAllStats().filter((c) => c.verified).slice(0, 60);
}

export function getTrending() {
  return trendingIds.map((id) => coins.get(id)).filter(Boolean);
}

export function getMemes() {
  return memeIds.map((id) => coins.get(id)).filter(Boolean);
}

export function searchLocal(q) {
  const needle = q.trim().toLowerCase();
  const all = getAllIds().map((id) => coins.get(id)).filter(Boolean);
  if (!needle) return all;
  return all.filter(
    (c) => c.symbol.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle),
  );
}

const WINDOW_KEYS = { "1h": "change1h", "24h": "change24h", "7d": "change7d", "30d": "change30d" };

export function changePct(id, window = "24h") {
  const c = coins.get(id);
  if (!c) return 0;
  return c[WINDOW_KEYS[window] || "change24h"] || 0;
}

/**
 * Price at a past timestamp.
 * Uses the 7d hourly sparkline when the timestamp falls inside it, and
 * otherwise interpolates between the known 1h/24h/7d/30d anchor points.
 */
export function priceAt(id, ts) {
  const c = coins.get(id);
  if (!c) return 0;
  const now = Date.now();
  const ageMs = Math.max(0, now - ts);
  if (ageMs < 60000) return c.price;

  const WEEK = 7 * 24 * 3600 * 1000;
  if (c.sparkline && c.sparkline.length > 1 && ageMs <= WEEK) {
    const n = c.sparkline.length;
    const step = WEEK / (n - 1);
    const idx = Math.round((WEEK - ageMs) / step);
    const v = c.sparkline[Math.max(0, Math.min(n - 1, idx))];
    if (v) return v;
  }

  // Anchors: price N ago = price / (1 + change/100).
  const anchors = [
    { age: 0, p: c.price },
    { age: 3600e3, p: c.price / (1 + (c.change1h || 0) / 100) },
    { age: 24 * 3600e3, p: c.price / (1 + (c.change24h || 0) / 100) },
    { age: WEEK, p: c.price / (1 + (c.change7d || 0) / 100) },
    { age: 30 * 24 * 3600e3, p: c.price / (1 + (c.change30d || 0) / 100) },
  ].filter((a) => Number.isFinite(a.p) && a.p > 0);

  if (ageMs >= anchors[anchors.length - 1].age) return anchors[anchors.length - 1].p;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (ageMs >= a.age && ageMs <= b.age) {
      const f = (ageMs - a.age) / (b.age - a.age || 1);
      return a.p + (b.p - a.p) * f;
    }
  }
  return c.price;
}

/* ── Charts ──────────────────────────────────────────────────────── */

export const TIMEFRAMES = ["1H", "24H", "1W", "1M"];

const history = new Map(); // `${id}:${days}` -> { ts, points }
const pending = new Set();

function loadChart(id, days) {
  const key = `${id}:${days}`;
  const hit = history.get(key);
  const ttl = days <= 1 ? 120000 : 600000;
  if (hit && Date.now() - hit.ts < ttl) return hit.points;
  if (pending.has(key)) return hit?.points || null;

  pending.add(key);
  fetchChart(id, days)
    .then((data) => {
      const points = (data?.prices || []).map(([t, p]) => ({ t, p }));
      if (points.length) history.set(key, { ts: Date.now(), points });
      emit();
    })
    .catch(() => {})
    .finally(() => pending.delete(key));

  return hit?.points || null;
}

/**
 * Points for a chart. Returns what's cached immediately and triggers a fetch
 * for anything missing — the market tick re-renders when it lands.
 * 1W comes free with the markets response, so it costs no extra request.
 */
export function getSeriesPoints(id, timeframe = "24H") {
  const c = coins.get(id);
  if (!c) return [];

  const spark = sparklinePoints(c);

  if (timeframe === "1W") {
    return spark.length ? spark : loadChart(id, 7) || [];
  }

  if (timeframe === "1M") return loadChart(id, 30) || [];

  if (timeframe === "24H") {
    // The 7d sparkline arrives with the price list, so the last 24 hourly
    // points give an instant chart. The finer 5-minute series replaces it
    // once it lands.
    const day = loadChart(id, 1);
    if (day?.length) return day;
    return spark.slice(-25);
  }

  // 1H needs the fine-grained series; there's no hourly substitute.
  const day = loadChart(id, 1);
  if (!day) return [];
  const cutoff = Date.now() - 3600 * 1000;
  const slice = day.filter((p) => p.t >= cutoff);
  return slice.length > 1 ? slice : day.slice(-13);
}

function sparklinePoints(c) {
  if (!c.sparkline?.length) return [];
  const WEEK = 7 * 24 * 3600 * 1000;
  const n = c.sparkline.length;
  const step = WEEK / (n - 1);
  const start = Date.now() - WEEK;
  return c.sparkline.map((p, i) => ({ t: start + i * step, p }));
}

/** Chain / platform label, fetched lazily the first time a token is opened. */
export function ensureChain(id) {
  const c = coins.get(id);
  if (!c || c.chain) return;
  const key = `chain:${id}`;
  if (pending.has(key)) return;
  pending.add(key);
  fetchCoin(id)
    .then((d) => {
      const platforms = Object.keys(d?.platforms || {}).filter(Boolean);
      const label = d?.asset_platform_id || platforms[0] || "native";
      c.chain = label
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      emit();
    })
    .catch(() => {})
    .finally(() => pending.delete(key));
}
