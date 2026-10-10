export const IN_PER_CM = 1 / 2.54;
export const toInches = (v, unit) => (unit === "cm" ? v * IN_PER_CM : v);
export const fromInches = (v, unit) => (unit === "cm" ? v * 2.54 : v);
export const fmtLen = (inches, unit, digits = 1) => {
  if (inches == null || !isFinite(inches)) return "—";
  const v = fromInches(inches, unit);
  return `${v.toFixed(digits).replace(/\.0$/, "")} ${unit === "cm" ? "cm" : "in"}`;
};
export const money = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
