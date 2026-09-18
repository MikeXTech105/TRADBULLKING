import { adminApi } from "./api.js";
import { unwrap, collection, identify } from "./adapters.js";
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
  instruments: async (params, signal) =>
    collection(
      await get("/admin/angelone/instruments", params, signal),
      "instruments",
    ),
  leaderboard: async (signal) =>
    collection(await get("/admin/leaderboard", undefined, signal), "entries"),
  addEntry: (body) => post("/admin/leaderboard", body),
  editEntry: (id, body) =>
    put(`/admin/leaderboard/${encodeURIComponent(id)}`, body),
  deleteEntry: (id) => remove(`/admin/leaderboard/${encodeURIComponent(id)}`),
};
