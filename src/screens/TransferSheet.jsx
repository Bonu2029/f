import { useState } from "react";
import { useStore, actions, portfolio } from "../engine/store.js";
import { Keypad, applyKey } from "../ui/Keypad.jsx";
import { IcApple, IcClose } from "../ui/Icons.jsx";
import { fmtUsd } from "../engine/format.js";

/** Deposit / withdraw — same keypad, different direction. */
export default function TransferSheet({ mode = "deposit", onClose, onDone }) {
  const state = useStore();
  const [amount, setAmount] = useState("0");
  const pf = portfolio(state);
  const usd = parseFloat(amount) || 0;

  const max = mode === "withdraw" ? pf.cash : Infinity;
  const over = usd > max;
  const valid = usd > 0 && !over;

  const submit = () => {
    if (!valid) return;
    const sig = mode === "deposit" ? actions.deposit(usd) : actions.withdraw(usd);
    onDone?.({ kind: mode, usd, sig });
  };

  const presets = mode === "deposit" ? [50, 100, 500, 1000] : [100, 500, 1000];

  return (
    <div className="col">
      <div className="row between" style={{ padding: "8px 16px 0" }}>
        <span className="h2">{mode === "deposit" ? "Deposit" : "Withdraw"}</span>
        <button className="muted" onClick={onClose} aria-label="Close">
          <IcClose size={22} />
        </button>
      </div>

      <div className="col" style={{ alignItems: "center", padding: "34px 16px 12px", gap: 8 }}>
        <div className="amount mono">${amount}</div>
        <div className="tiny muted">
          {mode === "deposit"
            ? "Added to your demo cash balance"
            : `${fmtUsd(pf.cash)} available to withdraw`}
        </div>
        {over && <div className="tiny down">More than your cash balance</div>}
      </div>

      <div className="row gap8" style={{ padding: "6px 16px 10px" }}>
        {presets.map((p) => (
          <button key={p} className="pct-chip" onClick={() => setAmount(String(p))}>
            ${p}
          </button>
        ))}
        {mode === "withdraw" && (
          <button className="pct-chip" onClick={() => setAmount(String(+pf.cash.toFixed(2)))}>
            Max
          </button>
        )}
      </div>

      <div style={{ padding: "0 8px" }}>
        <Keypad onKey={(k) => setAmount((a) => applyKey(a, k))} />
      </div>

      <div style={{ padding: "10px 16px 16px" }}>
        <button
          className={"btn btn-block " + (mode === "deposit" ? "btn-white" : "btn-green")}
          disabled={!valid}
          onClick={submit}
        >
          {mode === "deposit" ? (
            <>
              Add with <IcApple size={17} /> Pay
            </>
          ) : (
            "Withdraw"
          )}
        </button>
        <div className="tiny muted" style={{ textAlign: "center", marginTop: 10 }}>
          Demo funds only — no payment method is ever charged.
        </div>
      </div>
    </div>
  );
}
