import { useEffect, useState } from "react";
import { useStore, actions } from "../engine/store.js";
import { getStats, getSeriesPoints, ensureChain } from "../engine/market.js";
import { formatMc } from "../engine/tokens.js";
import { TokenAvatar } from "../ui/Avatar.jsx";
import { PriceChart } from "../ui/Chart.jsx";
import { Segmented, Pct } from "../ui/Common.jsx";
import { IcBack, IcStar, IcBell, IcPlus, IcTrash } from "../ui/Icons.jsx";
import { fmtUsd, fmtPrice, fmtQty, fmtCompact, timeAgo, since } from "../engine/format.js";
import { describeRule } from "../engine/alerts.js";

const TF = [
  { value: "1H", label: "1H" },
  { value: "24H", label: "24H" },
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
];

function Stat({ label, value, tone }) {
  return (
    <div className="card grow" style={{ minWidth: 0 }}>
      <div className="tiny muted truncate">{label}</div>
      <div className={"body mono truncate " + (tone || "")} style={{ marginTop: 5, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}

export default function TokenScreen({ tokenId, nav, back, onBuy, onSell }) {
  const state = useStore();
  const [tf, setTf] = useState("24H");

  // The chain label isn't in the markets response; fetch it once on open.
  useEffect(() => {
    ensureChain(tokenId);
  }, [tokenId]);

  const stat = getStats(tokenId);
  if (!stat) return null;

  const { token } = stat;
  const points = getSeriesPoints(tokenId, tf);
  const change = { "1H": stat.change1h, "24H": stat.change24h, "1W": stat.change7d, "1M": stat.change30d }[tf];
  const watched = state.watchlist.includes(tokenId);
  const pos = state.positions[tokenId];
  const posValue = pos ? pos.qty * stat.price : 0;
  const posPnl = pos ? posValue - pos.costBasis : 0;

  const myTrades = state.trades.filter((t) => t.tokenId === tokenId);
  const markers = myTrades.map((t) => ({ ts: t.ts, side: t.side }));
  const tokenAlerts = state.alerts.filter((a) => a.tokenId === tokenId);

  const quick = [
    { type: "price_above", value: +(stat.price * 1.1).toPrecision(4), label: "+10%" },
    { type: "price_above", value: +(stat.price * 1.25).toPrecision(4), label: "+25%" },
    { type: "price_below", value: +(stat.price * 0.9).toPrecision(4), label: "−10%" },
    { type: "price_below", value: +(stat.price * 0.75).toPrecision(4), label: "−25%" },
  ];

  return (
    <>
      <div className="appbar">
        <button onClick={back} aria-label="Back">
          <IcBack size={24} />
        </button>
        <div className="row gap8 grow" style={{ justifyContent: "center" }}>
          <TokenAvatar token={token} size={24} showVerified={false} />
          <span className="h3">{token.symbol}</span>
        </div>
        <button
          onClick={() => actions.toggleWatch(tokenId)}
          style={{ color: watched ? "var(--gold)" : "var(--muted)" }}
          aria-label="Watchlist"
        >
          <IcStar size={22} filled={watched} />
        </button>
      </div>

      <div className="scroll" style={{ paddingBottom: 150 }}>
        <div className="col pad" style={{ gap: 6 }}>
          <span className="small muted">{token.name}</span>
          <span className="h1 mono">{fmtPrice(stat.price)}</span>
          <div className="row gap8">
            <Pct value={change} size={15} weight={700} />
            <span className="small muted">past {tf.toLowerCase()}</span>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <PriceChart points={points} markers={markers} height={200} />
        </div>

        <div className="pad" style={{ marginTop: 6 }}>
          <Segmented options={TF} value={tf} onChange={setTf} />
        </div>

        {pos && (
          <div className="pad" style={{ marginTop: 18 }}>
            <div className="card">
              <div className="row between">
                <span className="small muted">Your position</span>
                <span className="tiny muted">opened {since(pos.openedAt)} ago</span>
              </div>
              <div className="row between" style={{ marginTop: 10 }}>
                <div className="col" style={{ gap: 3 }}>
                  <span className="h2 mono">{fmtUsd(posValue)}</span>
                  <span className="small muted mono">
                    {fmtQty(pos.qty)} {token.symbol}
                  </span>
                </div>
                <div className="col" style={{ alignItems: "flex-end", gap: 3 }}>
                  <span className={"h3 mono " + (posPnl >= 0 ? "up" : "down")}>
                    {fmtUsd(posPnl, { sign: true })}
                  </span>
                  <Pct value={(posPnl / pos.costBasis) * 100} size={13} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="section-title">Stats</div>
        <div className="col gap10 pad">
          <div className="row gap10">
            <Stat label="Market cap" value={formatMc(stat.mc)} />
            <Stat label="24h volume" value={"$" + fmtCompact(stat.vol24h)} />
          </div>
          <div className="row gap10">
            <Stat label="24h high" value={fmtPrice(stat.high24h)} tone="up" />
            <Stat label="24h low" value={fmtPrice(stat.low24h)} tone="down" />
          </div>
          <div className="row gap10">
            <Stat label="Chain" value={token.chain || "…"} />
            <Stat label="Market cap rank" value={token.rank ? `#${token.rank}` : "—"} />
          </div>
          <div className="row gap10">
            <Stat
              label="Circulating supply"
              value={token.supply ? `${fmtCompact(token.supply)} ${token.symbol}` : "—"}
            />
            <Stat label="All-time high" value={token.ath ? fmtPrice(token.ath) : "—"} />
          </div>
        </div>

        <div className="row between pad" style={{ marginTop: 22, marginBottom: 8 }}>
          <span className="h3">Alerts</span>
          <button
            className="row gap4 small"
            style={{ color: "var(--indigo-2)", fontWeight: 700 }}
            onClick={() => nav("alerts", { tokenId })}
          >
            <IcPlus size={15} /> New alert
          </button>
        </div>

        <div className="row gap8 pad" style={{ overflowX: "auto", paddingBottom: 4 }}>
          {quick.map((q) => (
            <button
              key={q.type + q.value}
              className="chip"
              style={{
                background: "var(--surface-2)",
                color: "#fff",
                flex: "none",
                padding: "9px 14px",
                fontSize: 14,
              }}
              onClick={() =>
                actions.addAlert({ tokenId, type: q.type, value: q.value, repeat: false })
              }
            >
              Alert at {q.label}
            </button>
          ))}
        </div>

        {tokenAlerts.length > 0 && (
          <div className="col" style={{ marginTop: 10 }}>
            {tokenAlerts.map((a) => (
              <div className="trow" key={a.id} style={{ paddingTop: 10, paddingBottom: 10 }}>
                <span style={{ color: a.enabled ? "var(--indigo-2)" : "var(--muted-2)" }}>
                  <IcBell size={19} />
                </span>
                <div className="grow col" style={{ gap: 2 }}>
                  <span className="body truncate">{describeRule(a)}</span>
                  <span className="tiny muted">
                    {a.lastFired
                      ? `fired ${since(a.lastFired)} ago`
                      : a.repeat
                        ? "repeating"
                        : "one-time"}
                  </span>
                </div>
                <button className="muted" onClick={() => actions.deleteAlert(a.id)} aria-label="Delete alert">
                  <IcTrash size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="empty tiny" style={{ padding: "20px 28px 4px", lineHeight: 1.6 }}>
          Live price, market cap and chart from CoinGecko
          {token.updatedAt ? ` · updated ${timeAgo(token.updatedAt)}` : ""}
        </div>
      </div>

      {/* Buy / Sell action bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "calc(var(--tabbar-h) + var(--safe-bottom))",
          padding: "10px 16px 12px",
          background: "linear-gradient(to top, #000 55%, rgba(0,0,0,0))",
          display: "flex",
          gap: 10,
          zIndex: 20,
        }}
      >
        {pos && (
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => onSell(tokenId)}>
            Sell
          </button>
        )}
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => onBuy(tokenId)}>
          Buy {token.symbol}
        </button>
      </div>
    </>
  );
}
