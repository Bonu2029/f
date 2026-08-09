/* The numeric keypad from the buy screen — the app never uses the system
   keyboard for amounts. */

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

export function Keypad({ onKey }) {
  return (
    <div className="keypad">
      {KEYS.map((k) => (
        <button key={k} className="key" onClick={() => onKey(k)} aria-label={k === "del" ? "Delete" : k}>
          {k === "del" ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 5H9L3 12l6 7h11a1 1 0 001-1V6a1 1 0 00-1-1z" strokeLinejoin="round" />
              <path d="M17 9l-5 6M12 9l5 6" strokeLinecap="round" />
            </svg>
          ) : (
            k
          )}
        </button>
      ))}
    </div>
  );
}

/** Apply a keypad press to an amount string, keeping it well-formed. */
export function applyKey(current, key, { maxDecimals = 2, maxLen = 12 } = {}) {
  if (key === "del") {
    const next = current.slice(0, -1);
    return next === "" ? "0" : next;
  }
  if (key === ".") {
    if (current.includes(".")) return current;
    return current + ".";
  }
  if (current === "0") return key;
  if (current.length >= maxLen) return current;
  const dot = current.indexOf(".");
  if (dot >= 0 && current.length - dot - 1 >= maxDecimals) return current;
  return current + key;
}
