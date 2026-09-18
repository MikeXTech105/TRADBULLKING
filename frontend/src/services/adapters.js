import { hasNumber } from "../utils/format.js";
import { registerInstrument } from "./instrumentRegistry.js";
export function unwrap(response) {
  const body = response.data;
  if (body?.success === false)
    throw new Error(body.message || "The request was rejected.");
  const data = body?.data ?? body;
  return body?.pagination
    ? Array.isArray(data)
      ? { items: data, pagination: body.pagination }
      : { ...data, pagination: body.pagination }
    : data;
}
export const identify = (row) => {
  if (!row) return row;
  const id = row.id ?? row._id;
  if (row.token) registerInstrument(id, row.token);
  return {
    ...row,
    id,
    ...(row.stockId && typeof row.stockId === "object"
      ? { stock: row.stockId, stockId: row.stockId.id ?? row.stockId._id }
      : {}),
  };
};
export function collection(data, key) {
  const rows = Array.isArray(data) ? data : (data?.items ?? data?.[key]);
  if (!Array.isArray(rows))
    throw new Error(
      `The server returned an unsupported ${key} response. Please retry or contact support.`,
    );
  const pagination = data?.pagination ?? {};
  return {
    rows: rows.map(identify),
    total: pagination.total ?? data?.total ?? pagination.totalItems,
    page: pagination.page ?? data?.page ?? 1,
    totalPages: pagination.pages ?? pagination.totalPages ?? data?.totalPages,
  };
}
export function profile(data) {
  return identify(data?.user ?? data);
}
export function tokens(data) {
  const source = data?.tokens ?? data;
  if (!source?.accessToken || !source?.refreshToken)
    throw new Error(
      "The server did not return access and refresh tokens. Please contact support.",
    );
  return { accessToken: source.accessToken, refreshToken: source.refreshToken };
}
// AngelOne's instrument master uses its own field names (symboltoken,
// tradingsymbol, exch_seg, lotsize, ...), distinct from TRADBULLKING's own
// Stock schema. Normalize once here rather than in every consuming
// component. A non-positive strike (AngelOne uses -1/0 for non-options) is
// treated as absent rather than a real value.
export function normalizeInstrument(row) {
  if (!row) return row;
  const strike = Number(row.strike);
  return {
    token: String(row.token ?? row.symboltoken ?? ""),
    symbol: row.tradingsymbol ?? row.symbol ?? row.name,
    name: row.name,
    exchange: row.exch_seg ?? row.exchange,
    instrumenttype: row.instrumenttype || undefined,
    lotSize: hasNumber(row.lotsize ?? row.lot_size)
      ? Number(row.lotsize ?? row.lot_size)
      : undefined,
    expiry: row.expiry || undefined,
    strike: hasNumber(strike) && strike > 0 ? strike : undefined,
    tickSize: hasNumber(row.tick_size ?? row.ticksize)
      ? Number(row.tick_size ?? row.ticksize)
      : undefined,
  };
}
export function candles(data) {
  const rows = Array.isArray(data) ? data : data?.candles;
  if (!Array.isArray(rows))
    throw new Error(
      "The server returned an unsupported historical candle response.",
    );
  const result = new Map();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const c = Array.isArray(row)
      ? { time: row[0], open: row[1], high: row[2], low: row[3], close: row[4] }
      : row;
    if (!["open", "high", "low", "close"].every((key) => hasNumber(c[key])))
      continue;
    const time =
      typeof c.time === "number"
        ? c.time > 1e12
          ? c.time / 1000
          : c.time
        : Date.parse(c.time ?? c.timestamp) / 1000;
    const normalized = {
      time: Math.floor(time),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
    };
    if (
      Object.values(normalized).every(Number.isFinite) &&
      normalized.low <= Math.min(normalized.open, normalized.close) &&
      normalized.high >= Math.max(normalized.open, normalized.close)
    )
      result.set(normalized.time, normalized);
  }
  if (rows.length && !result.size)
    throw new Error("No valid OHLC candles were returned by the server.");
  return [...result.values()].sort((a, b) => a.time - b.time);
}
