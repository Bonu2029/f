"""The desk: a local web dashboard that can screen, analyse, and place orders.

Run it with ``python -m tradingmachine serve`` and work from the browser.

Security, because this endpoint can move real money:

* It binds to **127.0.0.1** by default, so nothing outside your machine can
  reach it.
* Every mutating request must carry a **session token** minted at startup and
  embedded in the page. Without it, any website you happen to have open could
  POST an order to localhost while you browse — this is a real attack, not a
  hypothetical, and a token is the standard defence.
* Binding to a non-loopback address demands ``allow_remote=True`` and prints a
  warning, because that exposes an order-placing endpoint to your network.
"""

from __future__ import annotations

import json
import logging
import secrets
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from .config import AppConfig
from .desk import Desk, DeskError
from .models import Side
from .screener import screen, summarize
from .strategies import build_strategy
from .universe import resolve, universe_names

log = logging.getLogger(__name__)

_TOKEN = secrets.token_urlsafe(24)
_LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost"}


class DeskHandler(BaseHTTPRequestHandler):
    desk: Desk
    config: AppConfig
    server_version = "tradingmachine"

    # ---- plumbing ----------------------------------------------------- #

    def log_message(self, fmt: str, *args) -> None:
        log.debug("%s - %s", self.address_string(), fmt % args)

    def _send(self, code: int, body: bytes, ctype: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass  # the browser navigated away mid-response; nothing to do

    def _json(self, payload: dict, code: int = 200) -> None:
        self._send(code, json.dumps(payload, default=str).encode(), "application/json")

    def _err(self, message: str, code: int = 400) -> None:
        self._json({"ok": False, "error": message}, code)

    def _authorized(self) -> bool:
        return secrets.compare_digest(self.headers.get("X-Desk-Token", ""), _TOKEN)

    def _body(self) -> dict:
        try:
            n = int(self.headers.get("Content-Length") or 0)
            return json.loads(self.rfile.read(n) or b"{}")
        except (ValueError, json.JSONDecodeError):
            return {}

    # ---- routes -------------------------------------------------------- #

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler's naming
        route = urlparse(self.path)
        q = parse_qs(route.query)
        one = lambda k, d=None: (q.get(k) or [d])[0]  # noqa: E731

        try:
            if route.path in ("/", "/index.html"):
                page = PAGE.replace("__TOKEN__", _TOKEN).replace(
                    "__UNIVERSES__", json.dumps(universe_names())
                ).replace("__INTERVAL__", self.config.market.interval)
                return self._send(200, page.encode(), "text/html; charset=utf-8")

            if route.path == "/favicon.ico":
                return self._send(204, b"", "image/x-icon")

            if route.path == "/api/account":
                return self._json(self.desk.account_snapshot())

            if route.path == "/api/screen":
                return self._json(self._screen(one, q))

            if route.path == "/api/analyze":
                symbol = one("symbol")
                if not symbol:
                    return self._err("symbol is required")
                rep = self.desk.analyze(symbol, one("interval"), int(one("limit", 750)))
                return self._json({"ok": True, "report": rep.as_dict()})

            return self._err("no such endpoint", 404)
        except DeskError as exc:
            return self._err(str(exc))
        except Exception as exc:  # noqa: BLE001 - never take the desk down
            log.exception("GET %s failed", self.path)
            return self._err(f"{type(exc).__name__}: {exc}", 500)

    def _screen(self, one, q) -> dict:
        cfg = self.config
        universe = one("universe", "megacap")
        interval = one("interval") or cfg.market.interval
        strat_name = one("strategy")
        strategy = build_strategy({"name": strat_name} if strat_name else cfg.strategy)
        symbols = resolve(universe)

        rows = screen(
            symbols, strategy, interval, int(one("limit", 400)),
            workers=8, signals_only=one("signals") == "1",
        )
        return {
            "ok": True,
            "universe": universe,
            "interval": interval,
            "strategy": strategy.describe(),
            "summary": summarize(rows),
            "rows": [c.as_dict() for c in rows],
        }

    def do_POST(self) -> None:  # noqa: N802
        route = urlparse(self.path)
        if not self._authorized():
            return self._err(
                "missing or bad session token — reload the dashboard page", 403
            )
        body = self._body()

        try:
            if route.path == "/api/plan":
                plan = self._plan(body)
                return self._json({"ok": True, "plan": plan.as_dict()})

            if route.path == "/api/order":
                if not body.get("confirm"):
                    return self._err("orders require confirm=true")
                plan = self._plan(body)
                result = self.desk.execute(plan, bracket=body.get("bracket", True))
                log.warning(
                    "ORDER SENT %s %s %s @ %s",
                    result["side"], result["qty"], result["symbol"], result["price"],
                )
                return self._json(result)

            if route.path == "/api/close":
                symbol = body.get("symbol")
                if not symbol:
                    return self._err("symbol is required")
                if not body.get("confirm"):
                    return self._err("closing a position requires confirm=true")
                return self._json(self.desk.close(symbol))

            return self._err("no such endpoint", 404)
        except DeskError as exc:
            return self._err(str(exc))
        except Exception as exc:  # noqa: BLE001
            log.exception("POST %s failed", self.path)
            return self._err(f"{type(exc).__name__}: {exc}", 500)

    def _plan(self, body: dict):
        symbol = body.get("symbol")
        if not symbol:
            raise DeskError("symbol is required")
        if body.get("from_signal"):
            return self.desk.plan_from_signal(symbol, body.get("interval"))
        side = Side(body.get("side", "long"))
        qty = body.get("qty")
        return self.desk.plan(
            symbol, side, interval=body.get("interval"),
            qty=float(qty) if qty else None,
        )


def serve(
    config: AppConfig,
    host: str = "127.0.0.1",
    port: int = 8787,
    *,
    open_browser: bool = True,
    allow_remote: bool = False,
) -> None:
    if host not in _LOCAL_HOSTS and not allow_remote:
        raise SystemExit(
            f"refusing to bind {host}: this endpoint can place orders, so it is "
            "loopback-only unless you pass allow_remote=True and understand that "
            "anyone on your network could then reach it."
        )

    desk = Desk(config)
    DeskHandler.desk = desk
    DeskHandler.config = config

    httpd = ThreadingHTTPServer((host, port), DeskHandler)
    url = f"http://{host}:{port}/"

    snap = desk.account_snapshot()
    mode = "LIVE — REAL MONEY" if snap.get("live") else "paper"
    print(f"\n  tradingmachine desk  →  {url}")
    print(f"  broker   {snap['venue']}  [{mode}]")
    if snap["connected"]:
        print(f"  equity   {snap['equity']:,.2f}   buying power {snap['buying_power']:,.2f}")
    else:
        print(f"  broker   NOT CONNECTED — {snap.get('error', '')[:90]}")
        print("           screening and analysis still work; trading needs keys.")
    print("  Ctrl-C to stop\n")

    if open_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")
    finally:
        httpd.server_close()


# --------------------------------------------------------------------------- #
# the page
# --------------------------------------------------------------------------- #

PAGE = r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>tradingmachine desk</title>
<style>
:root{
  --ground:#EEF1F5;--surface:#fff;--raised:#F5F7FA;--line:#D3DAE3;--line-soft:#E4E9EF;
  --ink:#131922;--ink-2:#414D5E;--ink-3:#6C7C90;--accent:#A66E14;--accent-soft:rgba(166,110,20,.13);
  --pos:#23854B;--neg:#BE3A2D;--pos-soft:rgba(35,133,75,.12);--neg-soft:rgba(190,58,45,.12);
  --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
  --sans:ui-sans-serif,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
}
@media (prefers-color-scheme:dark){:root{
  --ground:#090C11;--surface:#111721;--raised:#171F2B;--line:#26303E;--line-soft:#1B2431;
  --ink:#E2E8F1;--ink-2:#A5B1C2;--ink-3:#74838F;--accent:#C2831F;--accent-soft:rgba(194,131,31,.16);
  --pos:#2E9E5B;--neg:#CF4436;--pos-soft:rgba(46,158,91,.15);--neg-soft:rgba(207,68,54,.15);
}}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font:13px/1.55 var(--mono)}
.wrap{max-width:1400px;margin:0 auto;padding:18px 16px 64px;display:flex;flex-direction:column;gap:26px}
h1,h2{margin:0;font-weight:600;letter-spacing:-.015em}
h1{font-size:15px} h2{font-size:17px}
.eyebrow{margin:0;font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-3)}
.num{font-variant-numeric:tabular-nums}
.pos{color:var(--pos)} .neg{color:var(--neg)}
.prose{font-family:var(--sans);color:var(--ink-2);max-width:70ch;margin:0}

.rail{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;
  padding-bottom:12px;border-bottom:1px solid var(--line)}
.badge{font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:2px 8px;border-radius:2px;
  border:1px solid currentColor;font-weight:600}
.badge--paper{color:var(--pos);background:var(--pos-soft)}
.badge--live{color:var(--neg);background:var(--neg-soft)}
.badge--off{color:var(--ink-3)}

.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:1px;
  background:var(--line-soft);border:1px solid var(--line-soft)}
.stat{background:var(--surface);padding:10px 12px;display:flex;flex-direction:column;gap:2px}
.stat dt{font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--ink-3)}
.stat dd{margin:0;font-size:18px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.02em}

.card{background:var(--surface);border:1px solid var(--line);border-radius:3px}
.card__head{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;
  padding:12px 14px;border-bottom:1px solid var(--line-soft)}
.controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
select,input{font:inherit;font-size:12px;color:var(--ink);background:var(--raised);
  border:1px solid var(--line);border-radius:2px;padding:5px 8px}
button{font:inherit;font-size:11.5px;letter-spacing:.03em;color:var(--ink);background:var(--raised);
  border:1px solid var(--line);border-radius:2px;padding:5px 11px;cursor:pointer}
button:hover:not(:disabled){border-color:var(--accent)}
button:disabled{opacity:.45;cursor:not-allowed}
button.primary{background:var(--accent-soft);border-color:var(--accent);font-weight:600}
button.danger{color:var(--neg);border-color:var(--neg)}
button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

.scroll{overflow-x:auto;max-height:560px;overflow-y:auto}
table{width:100%;border-collapse:collapse;font-size:12px}
th{position:sticky;top:0;background:var(--raised);text-align:left;font-size:10px;font-weight:600;
  letter-spacing:.11em;text-transform:uppercase;color:var(--ink-3);padding:8px 12px;
  border-bottom:1px solid var(--line);white-space:nowrap;z-index:1}
td{padding:7px 12px;border-bottom:1px solid var(--line-soft);white-space:nowrap}
tr:last-child td{border-bottom:0}
tbody tr:hover td{background:var(--raised)}
.r{text-align:right;font-variant-numeric:tabular-nums}
.sym{font-weight:600}
.chip{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;letter-spacing:.07em;
  padding:1px 6px;border-radius:2px;border:1px solid currentColor}
.chip--long{color:var(--pos);background:var(--pos-soft)}
.chip--short{color:var(--neg);background:var(--neg-soft)}
.chip--flat{color:var(--ink-3)}
.grade{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:1px 7px;
  border-radius:2px;border:1px solid currentColor}
.g-strong{color:var(--pos);background:var(--pos-soft)}
.g-positive{color:var(--accent);background:var(--accent-soft)}
.g-fragile{color:var(--accent)}
.g-negative{color:var(--neg);background:var(--neg-soft)}
.g-unknown{color:var(--ink-3)}
.mini{display:flex;gap:4px}

.grid{display:grid;grid-template-columns:minmax(0,1fr);gap:26px}
.note{font-size:11.5px;color:var(--ink-3);padding:10px 14px;font-family:var(--sans)}
.warn{border-left:3px solid var(--accent);background:var(--accent-soft);padding:10px 14px;
  font-family:var(--sans);font-size:12.5px}

dialog{border:1px solid var(--line);border-radius:4px;background:var(--surface);color:var(--ink);
  padding:0;max-width:520px;width:calc(100% - 32px)}
dialog::backdrop{background:rgba(0,0,0,.55)}
.modal__body{padding:16px 18px;display:flex;flex-direction:column;gap:12px}
.modal__foot{display:flex;gap:8px;justify-content:flex-end;padding:12px 18px;border-top:1px solid var(--line-soft)}
.kv{display:grid;grid-template-columns:1fr auto;gap:3px 14px;margin:0}
.kv dt{color:var(--ink-3);font-size:11.5px}
.kv dd{margin:0;font-size:12.5px;font-weight:600;font-variant-numeric:tabular-nums;text-align:right}
.spin{color:var(--ink-3);padding:16px;font-size:12px}
</style></head><body>
<div class="wrap">

  <div class="rail">
    <div style="display:flex;align-items:center;gap:10px">
      <h1>tradingmachine desk</h1>
      <span id="venue" class="badge badge--off">connecting…</span>
      <span id="mkt" class="eyebrow"></span>
    </div>
    <div class="controls">
      <button id="refresh">Refresh</button>
      <label class="eyebrow" style="display:flex;gap:6px;align-items:center">
        <input type="checkbox" id="auto" style="padding:0"> auto 30s
      </label>
    </div>
  </div>

  <div id="brokerwarn"></div>

  <dl class="stats" id="stats"></dl>

  <!-- positions -->
  <section class="card">
    <div class="card__head">
      <div><p class="eyebrow">Held at the broker</p><h2>Positions</h2></div>
      <span class="eyebrow" id="poscount"></span>
    </div>
    <div class="scroll"><table>
      <thead><tr><th>Symbol</th><th>Side</th><th class="r">Qty</th><th class="r">Entry</th>
      <th class="r">Last</th><th class="r">Value</th><th class="r">P&amp;L</th><th class="r">P&amp;L %</th><th></th></tr></thead>
      <tbody id="positions"></tbody>
    </table></div>
  </section>

  <!-- screener -->
  <section class="card">
    <div class="card__head">
      <div><p class="eyebrow">Scan · rank · analyse · trade</p><h2>Screener</h2></div>
      <div class="controls">
        <select id="universe"></select>
        <select id="interval">
          <option>1d</option><option>4h</option><option>1h</option><option>30m</option><option>15m</option>
        </select>
        <select id="strategy">
          <option value="">config default</option>
          <option>trend</option><option>breakout</option><option>meanrev</option>
        </select>
        <label class="eyebrow" style="display:flex;gap:6px;align-items:center">
          <input type="checkbox" id="signals"> signals only
        </label>
        <button id="scan" class="primary">Scan</button>
      </div>
    </div>
    <div id="scansum" class="note"></div>
    <div class="scroll"><table>
      <thead><tr><th>Symbol</th><th>Class</th><th class="r">Last</th><th class="r">1d</th>
      <th class="r">ATR%</th><th class="r">RSI</th><th class="r">ADX</th><th>Signal</th>
      <th>Reason</th><th>Edge</th><th></th></tr></thead>
      <tbody id="rows"><tr><td colspan="11" class="spin">Press Scan to begin.</td></tr></tbody>
    </table></div>
    <div class="note">
      Signals are the strategy's opinion, not a forecast. <b>Edge</b> backtests that
      exact strategy on that symbol's own history, including an out-of-sample check.
    </div>
  </section>
</div>

<!-- order ticket -->
<dialog id="ticket"><form method="dialog">
  <div class="modal__body">
    <div><p class="eyebrow" id="tk-mode">Paper order</p><h2 id="tk-title">—</h2></div>
    <dl class="kv" id="tk-kv"></dl>
    <div id="tk-warn"></div>
    <p class="prose" style="font-size:12px" id="tk-note"></p>
  </div>
  <div class="modal__foot">
    <button value="cancel">Cancel</button>
    <button id="tk-send" class="primary" value="send">Send order</button>
  </div>
</form></dialog>

<!-- edge report -->
<dialog id="edge"><form method="dialog">
  <div class="modal__body">
    <div><p class="eyebrow">Historical edge · out-of-sample tested</p><h2 id="ed-title">—</h2></div>
    <div id="ed-body" class="spin">Running backtest…</div>
  </div>
  <div class="modal__foot"><button value="ok">Close</button></div>
</form></dialog>

<script>
const TOKEN = "__TOKEN__", UNIVERSES = __UNIVERSES__, DEF_INTERVAL = "__INTERVAL__";
const $ = (id) => document.getElementById(id);
const nf = (v,d=2)=>(v==null?"—":Number(v).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d}));
const sgn = (v,d=2)=>(v==null?"—":(v>=0?"+":"−")+nf(Math.abs(v),d));
const kls = (v)=>v>=0?"pos":"neg";
const esc = (s)=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

async function api(path, body) {
  const opt = body
    ? {method:"POST", headers:{"Content-Type":"application/json","X-Desk-Token":TOKEN}, body:JSON.stringify(body)}
    : {};
  const r = await fetch(path, opt);
  const j = await r.json().catch(()=>({ok:false,error:"bad response from desk"}));
  if (!r.ok && !j.error) j.error = "HTTP " + r.status;
  return j;
}

/* ---- account ---------------------------------------------------------- */
async function loadAccount() {
  const a = await api("/api/account");
  const v = $("venue");
  v.textContent = a.connected ? (a.live ? "LIVE · REAL MONEY" : "PAPER") : "NOT CONNECTED";
  v.className = "badge " + (a.connected ? (a.live ? "badge--live" : "badge--paper") : "badge--off");
  $("mkt").textContent = a.connected ? (a.market_open ? "market open" : "market " + (a.market_note||"closed")) : "";

  $("brokerwarn").innerHTML = a.connected ? "" :
    `<div class="warn"><b>Broker not connected.</b> ${esc(a.error||"")}<br>
     Screening and edge analysis work without keys. To trade, get free paper keys at
     alpaca.markets, then <code>export ALPACA_KEY_ID=… ALPACA_SECRET_KEY=…</code> and restart.</div>`;

  $("stats").innerHTML = [
    ["Equity", "$"+nf(a.equity)], ["Cash", "$"+nf(a.cash)],
    ["Buying power", "$"+nf(a.buying_power)],
    ["Open P&L", sgn(a.unrealized), kls(a.unrealized)],
    ["Exposure", "$"+nf(a.exposure)], ["Positions", String(a.positions.length)],
  ].map(([k,v,c])=>`<div class="stat"><dt>${k}</dt><dd class="${c||""}">${v}</dd></div>`).join("");

  $("poscount").textContent = a.positions.length ? a.positions.length+" open" : "";
  $("positions").innerHTML = a.positions.length ? a.positions.map(p=>`
    <tr>
      <td class="sym">${esc(p.symbol)}</td>
      <td><span class="chip chip--${p.side}">${p.side==="long"?"▲":"▼"} ${p.side.toUpperCase()}</span></td>
      <td class="r">${nf(p.qty,4)}</td><td class="r">${nf(p.avg_entry)}</td>
      <td class="r">${nf(p.price)}</td><td class="r">${nf(p.market_value)}</td>
      <td class="r ${kls(p.unrealized_pl)}">${sgn(p.unrealized_pl)}</td>
      <td class="r ${kls(p.unrealized_plpc)}">${sgn(p.unrealized_plpc)}%</td>
      <td><button class="danger" data-close="${esc(p.symbol)}">Close</button></td>
    </tr>`).join("")
    : `<tr><td colspan="9" class="spin">No open positions.</td></tr>`;
}

/* ---- screener --------------------------------------------------------- */
async function scan() {
  const btn = $("scan"); btn.disabled = true; btn.textContent = "Scanning…";
  $("rows").innerHTML = `<tr><td colspan="11" class="spin">Fetching bars for every symbol…</td></tr>`;
  const qs = new URLSearchParams({
    universe: $("universe").value, interval: $("interval").value,
    strategy: $("strategy").value, signals: $("signals").checked ? "1" : "0",
  });
  const d = await api("/api/screen?" + qs);
  btn.disabled = false; btn.textContent = "Scan";

  if (!d.ok) { $("rows").innerHTML = `<tr><td colspan="11" class="spin">${esc(d.error)}</td></tr>`; return; }
  const s = d.summary;
  $("scansum").textContent =
    `${s.scanned} scanned · ${s.long} long · ${s.short} short · ${s.flat} flat · ${s.errors} errors`
    + ` · ${d.strategy} @ ${d.interval}`;

  $("rows").innerHTML = d.rows.length ? d.rows.map(c=>{
    if (c.error) return `<tr><td class="sym">${esc(c.symbol)}</td><td>${esc(c.asset_class)}</td>
      <td colspan="9" class="spin" style="padding:7px 12px">${esc(c.error)}</td></tr>`;
    const g = {long:"▲",short:"▼",flat:"■"}[c.side];
    return `<tr>
      <td class="sym">${esc(c.symbol)}</td><td style="color:var(--ink-3)">${esc(c.asset_class)}</td>
      <td class="r">${nf(c.price)}</td><td class="r ${kls(c.change_pct)}">${sgn(c.change_pct)}%</td>
      <td class="r">${nf(c.atr_pct,1)}%</td><td class="r">${nf(c.rsi,0)}</td><td class="r">${nf(c.adx,0)}</td>
      <td><span class="chip chip--${c.side}">${g} ${c.side.toUpperCase()}${c.has_signal?" "+Math.round(c.strength*100)+"%":""}</span></td>
      <td style="color:var(--ink-3)">${esc(c.reason).slice(0,42)}</td>
      <td><button data-edge="${esc(c.symbol)}">Edge</button></td>
      <td class="mini">
        <button data-buy="${esc(c.symbol)}">Buy</button>
        <button data-sell="${esc(c.symbol)}">Short</button>
      </td></tr>`;
  }).join("") : `<tr><td colspan="11" class="spin">Nothing matched.</td></tr>`;
}

/* ---- edge ------------------------------------------------------------- */
async function showEdge(symbol) {
  $("ed-title").textContent = symbol;
  $("ed-body").innerHTML = `<div class="spin">Backtesting ${esc(symbol)} — this takes a moment…</div>`;
  $("edge").showModal();
  const d = await api(`/api/analyze?symbol=${encodeURIComponent(symbol)}&interval=${$("interval").value}`);
  if (!d.ok) { $("ed-body").innerHTML = `<div class="spin">${esc(d.error)}</div>`; return; }
  const r = d.report, legs = [r.full, r.in_sample, r.out_sample];
  $("ed-body").innerHTML = `
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
      <span class="grade g-${r.grade}">${r.grade}</span>
      <span class="eyebrow">confidence: ${r.confidence}</span>
    </div>
    <div class="scroll" style="max-height:none"><table>
      <thead><tr><th>Window</th><th class="r">Trades</th><th class="r">Win%</th>
      <th class="r">Exp R</th><th class="r">PF</th><th class="r">Return</th></tr></thead>
      <tbody>${legs.map(l=>`<tr><td>${esc(l.label||"—")}</td><td class="r">${l.trades}</td>
        <td class="r">${nf(l.win_rate,1)}%</td>
        <td class="r ${kls(l.expectancy_r)}">${sgn(l.expectancy_r,3)}R</td>
        <td class="r">${nf(l.profit_factor)}</td>
        <td class="r ${kls(l.total_return_pct)}">${sgn(l.total_return_pct)}%</td></tr>`).join("")}</tbody>
    </table></div>
    <p class="prose" style="margin-top:12px"><b>${esc(r.verdict)}</b></p>
    <p class="prose" style="font-size:12px;color:var(--ink-3)">${esc(r.caveat)}</p>`;
}

/* ---- order ticket ----------------------------------------------------- */
let pending = null;
async function ticket(symbol, side) {
  pending = null;
  $("tk-title").textContent = `${side.toUpperCase()} ${symbol}`;
  $("tk-kv").innerHTML = ""; $("tk-warn").innerHTML = "";
  $("tk-note").textContent = "Sizing against your account and current volatility…";
  $("tk-send").disabled = true;
  $("ticket").showModal();

  const d = await api("/api/plan", {symbol, side, interval: $("interval").value});
  if (!d.ok) { $("tk-note").textContent = d.error; return; }
  const p = d.plan; pending = p;

  const live = $("venue").classList.contains("badge--live");
  $("tk-mode").textContent = live ? "LIVE ORDER — REAL MONEY" : "Paper order";
  $("tk-kv").innerHTML = [
    ["Quantity", nf(p.qty,4)], ["Est. price", "$"+nf(p.price)],
    ["Notional", "$"+nf(p.notional)],
    ["Stop", `$${nf(p.stop)}  (${nf(p.stop_distance_pct,2)}%)`],
    ["Target", p.target ? "$"+nf(p.target) : "none"],
    ["Risking", `$${nf(p.risk_amount)}  (${nf(p.risk_pct,2)}% of equity)`],
  ].map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join("");
  $("tk-warn").innerHTML = (p.warnings||[]).map(w=>`<div class="warn">${esc(w)}</div>`).join("");
  $("tk-note").textContent = p.qty >= 1
    ? "The stop and target are submitted to the broker with the entry, so they hold even if this program stops."
    : "Below one whole share, so no bracket can be attached — this position would have no stop at the broker.";
  $("tk-send").disabled = !p.tradable;
}

$("ticket").addEventListener("close", async () => {
  if ($("ticket").returnValue !== "send" || !pending) return;
  const p = pending; pending = null;
  const d = await api("/api/order", {
    symbol: p.symbol, side: p.side, qty: p.qty, interval: $("interval").value, confirm: true,
  });
  alert(d.ok
    ? `Filled ${p.side} ${nf(d.qty,4)} ${d.symbol} @ ${nf(d.price)}\nStop ${nf(d.stop)}\n\n${d.note}`
    : `Order failed:\n${d.error}`);
  loadAccount();
});

/* ---- wiring ----------------------------------------------------------- */
document.addEventListener("click", async (e) => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.edge) return showEdge(t.dataset.edge);
  if (t.dataset.buy)  return ticket(t.dataset.buy, "long");
  if (t.dataset.sell) return ticket(t.dataset.sell, "short");
  if (t.dataset.close) {
    const sym = t.dataset.close;
    if (!confirm(`Close the entire ${sym} position at market?`)) return;
    const d = await api("/api/close", {symbol: sym, confirm: true});
    if (!d.ok) alert("Close failed:\n" + d.error);
    loadAccount();
  }
});

$("universe").innerHTML = UNIVERSES.map(u=>`<option${u==="megacap"?" selected":""}>${u}</option>`).join("");
$("interval").value = ["1d","4h","1h","30m","15m"].includes(DEF_INTERVAL) ? DEF_INTERVAL : "1d";
$("scan").onclick = scan;
$("refresh").onclick = loadAccount;
let timer = null;
$("auto").onchange = (e) => {
  clearInterval(timer);
  if (e.target.checked) timer = setInterval(loadAccount, 30000);
};
loadAccount();
</script></body></html>
"""
