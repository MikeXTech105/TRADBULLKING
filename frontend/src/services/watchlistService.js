import { userApi } from "./api.js";
import { unwrap, collection } from "./adapters.js";
export const watchlistService = {
  list: async (signal) =>
    collection(unwrap(await userApi.get("/watchlist", { signal })), "stocks"),
  add: async (stockId) =>
    unwrap(await userApi.post("/watchlist/add", { stockId })),
  remove: async (id) =>
    unwrap(await userApi.delete(`/watchlist/${encodeURIComponent(id)}`)),
  clear: async () => unwrap(await userApi.delete("/watchlist/clear")),
};
