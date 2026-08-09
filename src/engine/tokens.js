/* Token helpers.

   The token universe is no longer hard-coded — it is whatever CoinGecko
   returns (top 100 by market cap, the meme board, and whatever is trending).
   This module just holds the formatting helpers that go with it. */

export { getToken, getStats, getPrice } from "./market.js";

/** Compact market-cap label, e.g. 2.2T / 99.7B / 160.6M. */
export function formatMc(n) {
  if (!n) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
