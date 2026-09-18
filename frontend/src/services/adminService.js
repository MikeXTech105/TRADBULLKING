import { adminApi } from "./api.js";
import { unwrap, collection, identify, normalizeInstrument } from "./adapters.js";
export const PROVIDER_EXCHANGES = ["NSE", "BSE", "NFO", "MCX", "CDS"];
export const PROVIDER_INSTRUMENT_TYPES = [
  { value: "stock", label: "Equity" },
  { value: "FUTSTK", label: "Stock futures" },
  { value: "OPTSTK", label: "Stock options" },
  { value: "FUTIDX", label: "Index futures" },
  { value: "OPTIDX", label: "Index options" },
  { value: "AMXIDX", label: "Index" },
];
const get = async (path, params, signal) =>
  unwrap(await adminApi.get(path, { params, signal }));
const put = async (path, body) => unwrap(await adminApi.put(path, body));
const post = async (path, body) => unwrap(await adminApi.post(path, body));
const remove = async (path) => unwrap(await adminApi.delete(path));
export const adminService = {
  dashboard: (signal) => get("/admin/dashboard", undefined, signal),
  users: async (params, signal) =>
    collection(await get("/admin/users", params, signal), "users"),
  user: async (id) =>
    identify(await get(`/admin/users/${encodeURIComponent(id)}`)),
  trades: async (id, params, signal) =>
    collection(
      await get(
        `/admin/users/${encodeURIComponent(id)}/trades`,
        params,
        signal,
      ),
      "trades",
    ),
  pnl: (id) => get(`/admin/users/${encodeURIComponent(id)}/pnl`),
  toggleUser: (id) =>
    put(`/admin/users/${encodeURIComponent(id)}/toggle-active`),
  stocks: async (params, signal) =>
    collection(await get("/admin/stocks", params, signal), "stocks"),
  addStock: (body) => post("/admin/stocks", body),
  editStock: (id, body) => put(`/admin/stocks/${encodeURIComponent(id)}`, body),
  toggleStock: (id) => put(`/admin/stocks/${encodeURIComponent(id)}/toggle`),
  deleteStock: (id) => remove(`/admin/stocks/${encodeURIComponent(id)}`),
  sync: () => post("/admin/stocks/sync-prices"),
  angelSession: (body) => post("/admin/angelone/session", body),
  instruments: async ({ instrumenttype, ...params } = {}, signal) => {
    // The live backend's instrument-type query param is `type`, not the
    // `instrumenttype` name production Swagger documents.
    const result = collection(
      await get(
        "/admin/angelone/instruments",
        { ...params, type: instrumenttype },
        signal,
      ),
      "instruments",
    );
    return { ...result, rows: result.rows.map(normalizeInstrument) };
  },
  leaderboard: async (signal) =>
    collection(await get("/admin/leaderboard", undefined, signal), "entries"),
  addEntry: (body) => post("/admin/leaderboard", body),
  editEntry: (id, body) =>
    put(`/admin/leaderboard/${encodeURIComponent(id)}`, body),
  deleteEntry: (id) => remove(`/admin/leaderboard/${encodeURIComponent(id)}`),
};
