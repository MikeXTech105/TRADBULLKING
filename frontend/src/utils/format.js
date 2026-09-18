export const hasNumber = (value) =>
  (typeof value === "number" || typeof value === "string") &&
  value !== null &&
  value !== undefined &&
  value !== "" &&
  Number.isFinite(Number(value));
export function formatINR(value, decimals = 2) {
  return hasNumber(value)
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(Number(value))
    : "—";
}
export function formatPercent(value) {
  return hasNumber(value)
    ? `${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(2)}%`
    : "—";
}
export function formatPnl(value) {
  return hasNumber(value)
    ? `${Number(value) > 0 ? "+" : ""}${formatINR(value)}`
    : "—";
}
export const formatNumber = (value) =>
  hasNumber(value)
    ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(
        Number(value),
      )
    : "—";
export function formatDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
export const pnlClass = (value) =>
  hasNumber(value)
    ? Number(value) > 0
      ? "positive"
      : Number(value) < 0
        ? "negative"
        : ""
    : "";
