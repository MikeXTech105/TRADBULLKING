import { hasNumber } from "../utils/format";

export const num = (value, decimals = 2) =>
  hasNumber(value) ? Number(value).toFixed(decimals) : "0.00";

export const grouped = (value, decimals = 2) =>
  hasNumber(value)
    ? Number(value).toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : "0.00";

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

// Expiry as "29SEP2026". Provider expiry is already in that form; ISO dates are converted.
export function expiryLabel(stock) {
  const raw = stock?.expiry;
  if (!raw) return "";
  if (/^\d{1,2}[A-Za-z]{3}\d{4}$/.test(raw)) return String(raw).toUpperCase();
  const d = new Date(raw);
  return Number.isNaN(d.getTime())
    ? ""
    : `${String(d.getDate()).padStart(2, "0")}${MONTHS[d.getMonth()]}${d.getFullYear()}`;
}

export function expiryDate(stock) {
  const label = expiryLabel(stock);
  const m = /^(\d{1,2})([A-Z]{3})(\d{4})$/.exec(label);
  return m
    ? `${m[1].padStart(2, "0")}-${String(MONTHS.indexOf(m[2]) + 1).padStart(2, "0")}-${m[3]}`
    : "";
}

export const baseName = (stock) =>
  stock?.name && !/\s/.test(String(stock.name).trim()) && stock.expiry
    ? stock.name
    : (stock?.symbol ?? stock?.name ?? "—");

export const lotSizeOf = (stock) => {
  const size = Number(stock?.lotSize ?? stock?.lotsize ?? stock?.stock?.lotSize);
  return Number.isFinite(size) && size > 0 ? size : 1;
};

const pad = (n) => String(n).padStart(2, "0");

// 16-09-2026 01:43:56
export function stamp(value) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return "—";
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export const stockOf = (row) => row?.stock ?? row;

export const exchangeGroup = (exchange) => {
  const e = String(exchange ?? "").toUpperCase();
  if (e === "NSE" || e === "BSE") return "NSE";
  if (e === "MCX") return "MCX";
  if (e === "NFO" || e === "BFO") return "NOPT";
  return "GLOBAL";
};
