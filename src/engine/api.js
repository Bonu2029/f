/* CoinGecko client.

   The public API needs no key and allows browser requests, which is what lets
   this app run with real market data and no backend of its own. The free tier
   is rate limited, so every call goes through a small cache + backoff layer
   and the app polls on a slow, fixed schedule. */

const BASE = "https://api.coingecko.com/api/v3";

/** Optional: paste a CoinGecko Demo key in Settings to raise the rate limit. */
let apiKey = null;
export function setApiKey(key) {
  apiKey = key || null;
}

export const status = {
  state: "idle", // idle | ok | limited | offline
  lastOk: null,
  lastError: null,
};

const listeners = new Set();
export function onStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function setStatus(state, error = null) {
  status.state = state;
  status.lastError = error;
  if (state === "ok") status.lastOk = Date.now();
  listeners.forEach((l) => l());
}

const cache = new Map(); // url -> { ts, data }
const inflight = new Map(); // url -> Promise
let backoffUntil = 0;

/**
 * GET with a TTL cache. Concurrent callers share one request, 429s trigger a
 * cooldown, and stale cache is served rather than failing the UI.
 */
export async function get(path, { ttl = 60000, params = {} } = {}) {
  // The key goes in the query string, not a header: CoinGecko's CORS policy
  // doesn't allow the x-cg-demo-api-key header, and adding it would turn every
  // request into a preflight that fails — including from a file:// page.
  const withKey = apiKey ? { ...params, x_cg_demo_api_key: apiKey } : params;
  const qs = new URLSearchParams(withKey).toString();
  const url = `${BASE}${path}${qs ? `?${qs}` : ""}`;

  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < ttl) return hit.data;

  if (Date.now() < backoffUntil) {
    if (hit) return hit.data;
    throw new Error("rate-limited");
  }

  if (inflight.has(url)) return inflight.get(url);

  const req = (async () => {
    try {
      // No custom request headers — anything beyond a simple GET would
      // trigger a CORS preflight that CoinGecko rejects.
      const res = await fetch(url);

      if (res.status === 429) {
        backoffUntil = Date.now() + 60000;
        setStatus("limited", "Rate limited by CoinGecko — backing off for a minute");
        if (hit) return hit.data;
        throw new Error("rate-limited");
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      cache.set(url, { ts: Date.now(), data });
      setStatus("ok");
      return data;
    } catch (err) {
      // Serve stale data rather than blanking the screen.
      if (hit) {
        setStatus("limited", String(err.message || err));
        return hit.data;
      }
      setStatus("offline", String(err.message || err));
      throw err;
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, req);
  return req;
}

/** Top coins by market cap, with 7d sparkline and multi-window changes. */
export function fetchMarkets({ perPage = 100, category = null } = {}) {
  return get("/coins/markets", {
    ttl: 55000,
    params: {
      vs_currency: "usd",
      order: "market_cap_desc",
      per_page: perPage,
      page: 1,
      sparkline: "true",
      price_change_percentage: "1h,24h,7d,30d",
      ...(category ? { category } : {}),
    },
  });
}

/** What's actually trending on CoinGecko right now. */
export function fetchTrending() {
  return get("/search/trending", { ttl: 300000 });
}

/** Historical prices: [[ts, price], ...]. */
export function fetchChart(id, days) {
  return get(`/coins/${id}/market_chart`, {
    ttl: days <= 1 ? 120000 : 600000,
    params: { vs_currency: "usd", days: String(days) },
  });
}

/** Coin detail — used only for the chain/platform label. */
export function fetchCoin(id) {
  return get(`/coins/${id}`, {
    ttl: 3600000,
    params: {
      localization: "false",
      tickers: "false",
      market_data: "false",
      community_data: "false",
      developer_data: "false",
      sparkline: "false",
    },
  });
}

export function searchCoins(query) {
  return get("/search", { ttl: 300000, params: { query } });
}
