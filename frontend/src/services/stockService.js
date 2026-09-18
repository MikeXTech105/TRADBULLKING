import { userApi } from "./api.js";
import { unwrap, collection, identify, candles } from "./adapters.js";
export const intervals = [
  { value: "ONE_MINUTE", label: "1m", seconds: 60 },
  { value: "THREE_MINUTE", label: "3m", seconds: 180 },
  { value: "FIVE_MINUTE", label: "5m", seconds: 300 },
  { value: "FIFTEEN_MINUTE", label: "15m", seconds: 900 },
  { value: "THIRTY_MINUTE", label: "30m", seconds: 1800 },
  { value: "ONE_HOUR", label: "1H", seconds: 3600 },
  { value: "ONE_DAY", label: "1D", seconds: 86400 },
];
export const stockService = {
  list: async (params, signal) =>
    collection(
      unwrap(await userApi.get("/stocks", { params, signal })),
      "stocks",
    ),
  search: async (params, signal) =>
    collection(
      unwrap(await userApi.get("/stocks/search", { params, signal })),
      "stocks",
    ),
  get: async (id, signal) =>
    identify(
      unwrap(
        await userApi.get(`/stocks/${encodeURIComponent(id)}`, { signal }),
      ),
    ),
  symbol: async (symbol) =>
    identify(
      unwrap(await userApi.get(`/stocks/symbol/${encodeURIComponent(symbol)}`)),
    ),
  ltp: async (id, signal) => ({
    ...unwrap(
      await userApi.get(`/stocks/${encodeURIComponent(id)}/ltp`, {
        params: { fresh: "true" },
        signal,
      }),
    ),
    id,
  }),
  historical: async (id, params, signal) =>
    candles(
      unwrap(
        await userApi.get(`/stocks/${encodeURIComponent(id)}/historical`, {
          params,
          signal,
        }),
      ),
    ),
  angelSearch: async (values) =>
    unwrap(await userApi.post("/stocks/search-angelone", values)),
};
