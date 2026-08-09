import { useEffect } from "react";
import { getToken } from "../engine/tokens.js";
import { IcArrowUp, IcArrowDown, IcCheck } from "../ui/Icons.jsx";
import { fmtUsd, fmtQty, shortSig } from "../engine/format.js";

/** The confirmation screen: big status glyph, amount, fake signature. */
export default function Success({ result, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!result) return null;
  const token = result.tokenId ? getToken(result.tokenId) : null;

  const config = {
    deposit: { verb: "Deposited", color: "var(--indigo)", icon: <IcArrowDown size={30} />, bar: "Deposit complete" },
    withdraw: { verb: "Withdrew", color: "var(--up)", icon: <IcArrowUp size={30} />, bar: "Withdraw complete" },
    buy: { verb: "Bought", color: "var(--up)", icon: <IcArrowDown size={30} />, bar: "Buy complete" },
    sell: { verb: "Sold", color: "#F97316", icon: <IcArrowUp size={30} />, bar: "Sell complete" },
  }[result.kind];


  return (
    <div className="col" style={{ height: "100%", background: "#000" }}>
      <div
        className="col grow"
        style={{ alignItems: "center", justifyContent: "center", gap: 14, padding: 24 }}
      >
        <div
          style={{
            width: 78,
            height: 78,
            borderRadius: "50%",
            background: config.color,
            display: "grid",
            placeItems: "center",
            color: "#04210f",
          }}
        >
          {config.icon}
        </div>

        <div className="h2" style={{ marginTop: 6 }}>
          {config.verb}
        </div>
        <div className="h1 mono">{fmtUsd(result.usd)}</div>

        {token && (
          <div className="small muted mono">
            {fmtQty(result.qty)} {token.symbol}
          </div>
        )}
        {result.realized != null && (
          <div className={"small mono " + (result.realized >= 0 ? "up" : "down")}>
            {fmtUsd(result.realized, { sign: true })} realised
          </div>
        )}

        <div className="row gap8" style={{ marginTop: 10 }}>
          <span className="muted" style={{ opacity: 0.6 }}>
            ≡
          </span>
          <span className="body mono muted">{shortSig(result.sig)}</span>
        </div>

        <div
          className="tiny muted"
          style={{ marginTop: 6, textAlign: "center", maxWidth: 260, lineHeight: 1.6 }}
        >
          Filled at the live market price. This is a paper trade — the reference above is
          a local record, not an on-chain transaction.
        </div>
      </div>

      <button
        className="btn btn-block"
        style={{
          background: config.color,
          color: "#04210f",
          borderRadius: 0,
          height: 62,
          paddingBottom: "var(--safe-bottom)",
        }}
        onClick={onClose}
      >
        {config.bar} <IcCheck size={19} />
      </button>
    </div>
  );
}
