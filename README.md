# fomo — solo build

A rebuild of the **fomo — never miss out** crypto app's screens and behaviour, as a
single-user app that runs in your browser.

**Real market data, your data only.** Prices, market caps, charts and logos are live from
CoinGecko. Your portfolio, watchlist and alerts live in your browser's local storage —
there's no account, no server, and no other user's data anywhere in it.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. Vite prints a second "Network" URL — open that one on your
phone (same Wi-Fi), then **Share → Add to Home Screen** and it launches full-screen like a
native app.

To build a static version you can host anywhere: `npm run build` (output in `dist/`).

## Screens

| Screen | What it does |
| --- | --- |
| **Home** | Portfolio value, Deposit, Top trades strip, and the Verified / Trending / Memes / watchlist boards |
| **Feed** | For you & Following — position cards with sparklines and entry/exit markers |
| **Ranks** | Friends & Leaderboard, your rank, 24h / 7d / 30d, % or $ |
| **Wallet** | Holdings with live P&L, cash, realised P&L, full transaction history |
| **Token** | Live chart (1H / 24H / 1W / 1M), your position, stats, per-token alerts |
| **Buy / Sell** | The keypad sheet with 25/50/75/100% and an Apple Pay-style confirm |
| **Alerts** | Notification centre + alert rule manager |
| **Settings** | Profile, alert preferences, data source status, reset |

## Alerts

Alerts are evaluated every few seconds against live prices. They fire four ways at once:
the in-app notification centre (with the unread badge on the bell), an on-screen toast, an
optional chime, and — if you grant permission — a real system notification.

**Rules you set** (Alerts → +, or the quick chips on any token screen):

- Price rises above / drops below a target
- Up or down more than X% over 1h or 24h
- Your position up or down X%

Each rule is one-shot or repeating (repeats are capped at once per 10 minutes).

**Automatic watchers** (toggleable in Settings):

- Traders you follow opening or closing a position
- Anything you hold or watch moving more than your threshold in an hour
- Top-ranked coins moving 20%+ in a day

## What's real and what isn't

**Real:** every price, market cap, 24h high/low, volume, % change, chart and coin logo —
live from CoinGecko's public API, refreshed each minute. Your P&L is computed from real
historical prices, including the opening positions the app deals you on first launch.

**Not real — and deliberately so:**

- **Trades are paper trades.** They fill instantly at the live market price and update
  your local portfolio. No exchange, no wallet, no real money. Deposit and withdraw move a
  demo cash balance.
- **The traders are invented.** fomo's social layer is other people's private trading
  activity — there's no public API for it, and it isn't mine to copy. So the feed,
  leaderboard and friends are populated by fictional traders generated on your device.
  They hold real coins and their P&L moves with the real market, but no real person appears
  anywhere in this app. Every screen that shows them says so.

## Rate limits

The app polls on a slow schedule (about 3 requests a minute) to stay inside CoinGecko's
free tier, caches everything, and backs off on a 429 while continuing to show the last
prices it received. If lists ever stop refreshing, paste a free CoinGecko **Demo** API key
into Settings → Market data.

Offline, the app says "Offline — showing last prices received" rather than inventing
numbers.

## Layout

```
src/
  engine/
    api.js       CoinGecko client — caching, backoff, status
    market.js    live snapshot, history, charts, priceAt()
    alerts.js    alert rules + ambient watchers + delivery
    store.js     your single local profile (localStorage)
    traders.js   the fictional social layer
    tokens.js    formatting helpers
    format.js    money / percent / time formatting
    rng.js       seeded randomness (fictional traders only)
  screens/       one file per screen
  ui/            avatars, charts, keypad, sheets, icons
```

## Notes

- Not affiliated with fomo labs, inc. This is a personal rebuild of the app's
  interface for a single user.
- Nothing here is financial advice, and paper P&L is not a real result.
