/* Number and time formatting, matched to how the app displays values. */

export function fmtUsd(n, { compact = false, sign = false } = {}) {
  if (n === null || n === undefined || Number.isNaN(n)) return "$0.00";
  const neg = n < 0;
  const abs = Math.abs(n);
  let body;
  if (compact && abs >= 1000) {
    if (abs >= 1e12) body = (abs / 1e12).toFixed(2) + "T";
    else if (abs >= 1e9) body = (abs / 1e9).toFixed(2) + "B";
    else if (abs >= 1e6) body = (abs / 1e6).toFixed(2) + "M";
    else body = (abs / 1e3).toFixed(2) + "K";
  } else {
    body = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const prefix = neg ? "-" : sign ? "+" : "";
  return `${prefix}$${body}`;
}

/** Token prices need a lot of precision at the memecoin end of the range. */
export function fmtPrice(p) {
  if (p === null || p === undefined || Number.isNaN(p)) return "$0.00";
  if (p >= 1000) return "$" + p.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  if (p >= 1) return "$" + p.toFixed(2);
  if (p >= 0.01) return "$" + p.toFixed(4);
  if (p >= 0.0001) return "$" + p.toFixed(5);
  return "$" + p.toFixed(8).replace(/0+$/, "");
}

export function fmtPct(p, { sign = true, digits = 2 } = {}) {
  if (p === null || p === undefined || Number.isNaN(p)) return "0.00%";
  const s = sign && p > 0 ? "" : "";
  return `${s}${Math.abs(p).toFixed(digits)}%`;
}

export function fmtQty(q) {
  if (q === null || q === undefined || Number.isNaN(q)) return "0";
  if (q >= 1e9) return (q / 1e9).toFixed(2) + "B";
  if (q >= 1e6) return (q / 1e6).toFixed(2) + "M";
  if (q >= 1000) return Math.round(q).toLocaleString("en-US");
  if (q >= 1) return q.toFixed(2);
  return q.toFixed(6).replace(/0+$/, "");
}

export function fmtCompact(n) {
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.round(n));
}

/** "5m", "8:12 am", "3d" — the mixed style the feed uses. */
export function timeAgo(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 12) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 1) {
    return new Date(ts)
      .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      .toLowerCase();
  }
  if (d < 7) return `${d}d`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Duration-only label, for text that already reads "... ago". */
export function since(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "moments";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mo`;
}

export function shortSig(sig) {
  if (!sig) return "";
  return sig.slice(0, 6) + "..." + sig.slice(-6);
}
