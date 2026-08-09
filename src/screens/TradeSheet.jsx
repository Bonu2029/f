import { useMemo, useState } from "react";
import { useStore, actions, portfolio } from "../engine/store.js";
import { getStats } from "../engine/market.js";
import { formatMc } from "../engine/tokens.js";
import { TokenAvatar, AvatarStack } from "../ui/Avatar.jsx";
import { Keypad, applyKey } from "../ui/Keypad.jsx";
import { Pct, holderIdsFor } from "../ui/Common.jsx";
import { IcApple, IcSwap, IcChevron, IcClose } from "../ui/Icons.jsx";
import { fmtPrice, fmtQty, fmtUsd } from "../engine/format.js";

/** Buy or sell sheet — the keypad screen from the app, with a Sell variant. */
export default function TradeSheet({ tokenId, side = "buy", onClose, onDone }) {
  const state = useStore();
  const [amount, setAmount] = useState("0");
  const [inToken, setInToken] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);

  const stat = getStats(tokenId);
  const pf = portfolio(state);
  const pos = state.positions[tokenId];

  const maxUsd = side === "buy" ? pf.cash : pos ? pos.qty * (stat?.price || 0) : 0;

  const { usd, qty } = useMemo(() => {
    const n = parseFloat(amount) || 0;
    if (!stat) return { usd: 0, qty: 0 };
    return inToken ? { usd: n * stat.price, qty: n } : { usd: n, qty: stat.price ? n / stat.price : 0 };
  }, [amount, inToken, stat]);

  if (!stat) return null;
  const { token } = stat;

  const setPct = (p) => {
    const target = maxUsd * p;
    setAmount(inToken ? String(+(target / stat.price).toFixed(6)) : String(+target.toFixed(2)));
  };

  const overspend = usd > maxUsd + 1e-6;
  const valid = usd > 0 && !overspend;

  const submit = () => {
    if (!valid) return;
    if (side === "buy") {
      const trade = actions.buy(tokenId, usd);
      onDone?.({ kind: "buy", tokenId, usd, qty: trade.qty, sig: trade.sig });
    } else {
      const fraction = Math.min(1, usd / (maxUsd || 1));
      const trade = actions.sell(tokenId, fraction);
      onDone?.({
        kind: "sell",
        tokenId,
        usd: trade.usd,
        qty: trade.qty,
        sig: trade.sig,
        realized: trade.realized,
      });
    }
  };

  return (
    <div className="col" style={{ minHeight: 0 }}>
      {/* Token header */}
      <div className="row gap10" style={{ padding: "8px 16px 4px" }}>
        <TokenAvatar token={token} size={40} />
        <div className="grow col" style={{ gap: 4, minWidth: 0 }}>
          <div className="h3 truncate">{token.symbol}</div>
          <div className="row gap6">
            <span className="mc-tag">MC</span>
            <span className="small muted mono">{formatMc(stat.mc)}</span>
            <AvatarStack ids={holderIdsFor(tokenId)} extra={5} />
          </div>
        </div>
        <div className="col" style={{ alignItems: "flex-end", gap: 4 }}>
          <div className="h3 mono">{fmtPrice(stat.price)}</div>
          <Pct value={stat.change24h} size={13} />
        </div>
        <button className="muted" onClick={onClose} aria-label="Close" style={{ marginLeft: 4 }}>
          <IcClose size={20} />
        </button>
      </div>

      {/* Amount */}
      <div className="col" style={{ alignItems: "center", padding: "26px 16px 10px", gap: 8 }}>
        <div className="amount mono">
          {inToken ? `${amount}` : `$${amount}`}
        </div>
        <button className="row gap6 muted" onClick={() => setInToken((v) => !v)}>
          <span className="body mono">
            {inToken ? fmtUsd(usd) : `${fmtQty(qty)} ${token.symbol}`}
          </span>
          <IcSwap size={16} />
        </button>
        <div className="tiny muted" style={{ marginTop: 2 }}>
          {side === "buy"
            ? `${fmtUsd(pf.cash)} available`
            : `${fmtQty(pos?.qty || 0)} ${token.symbol} held · ${fmtUsd(maxUsd)}`}
        </div>
        {overspend && (
          <div className="tiny down" style={{ marginTop: 2 }}>
            {side === "buy" ? "More than your cash balance" : "More than you hold"}
          </div>
        )}
      </div>

      {/* Percent chips */}
      <div className="row gap8" style={{ padding: "6px 16px 10px" }}>
        {[0.25, 0.5, 0.75, 1].map((p) => (
          <button key={p} className="pct-chip" onClick={() => setPct(p)}>
            {p * 100}%
          </button>
        ))}
      </div>

      <div style={{ padding: "0 8px" }}>
        <Keypad
          onKey={(k) => setAmount((a) => applyKey(a, k, { maxDecimals: inToken ? 6 : 2 }))}
        />
      </div>

      {/* Fee row */}
      <div className="row between" style={{ padding: "6px 20px 8px" }}>
        <span className="row gap4" style={{ fontWeight: 700, fontSize: 15 }}>
          {side === "buy" ? (
            <>
              <IcApple size={15} /> Pay
            </>
          ) : (
            <span className="muted small">Settles instantly</span>
          )}
        </span>
        <button
          className="row gap4 small"
          style={{ color: "var(--indigo-2)", fontWeight: 700 }}
          onClick={() => setFeeOpen((v) => !v)}
        >
          $0 fee on first buy
          <span style={{ transform: feeOpen ? "rotate(-90deg)" : "none", display: "inline-flex" }}>
            <IcChevron dir="down" size={15} />
          </span>
        </button>
      </div>
      {feeOpen && (
        <div className="tiny muted" style={{ padding: "0 20px 8px" }}>
          Demo build — no fees, no spread, no slippage. Orders fill instantly at the
          simulated mid price.
        </div>
      )}

      <div style={{ padding: "0 16px 16px" }}>
        <button
          className={"btn btn-block " + (side === "buy" ? "btn-white" : "btn-red")}
          disabled={!valid}
          onClick={submit}
        >
          {side === "buy" ? (
            <>
              Buy with <IcApple size={17} /> Pay
            </>
          ) : (
            `Sell ${token.symbol}`
          )}
        </button>
      </div>
    </div>
  );
}
