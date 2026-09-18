import { userApi } from "./api.js";
import { unwrap, collection, identify } from "./adapters.js";
export function orderPayload({
  stockId,
  side,
  quantity,
  priceType,
  limitPrice,
}) {
  if (!stockId || !["BUY", "SELL"].includes(side))
    throw new Error("Select a valid instrument and order side.");
  if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1)
    throw new Error("Quantity must be a positive whole number.");
  if (!["MARKET", "LIMIT"].includes(priceType))
    throw new Error("This order type is not supported.");
  if (
    priceType === "LIMIT" &&
    (!Number.isFinite(Number(limitPrice)) || Number(limitPrice) <= 0)
  )
    throw new Error("Enter a valid limit price.");
  return {
    stockId,
    orderType: side,
    quantity: Number(quantity),
    priceType,
    ...(priceType === "LIMIT" ? { limitPrice: Number(limitPrice) } : {}),
  };
}
export const orderService = {
  list: async (params, signal) =>
    collection(
      unwrap(await userApi.get("/orders", { params, signal })),
      "orders",
    ),
  get: async (id) =>
    identify(unwrap(await userApi.get(`/orders/${encodeURIComponent(id)}`))),
  open: async (signal) =>
    collection(
      unwrap(await userApi.get("/orders/positions/open", { signal })),
      "positions",
    ),
  closed: async (params, signal) =>
    collection(
      unwrap(await userApi.get("/orders/positions/closed", { params, signal })),
      "positions",
    ),
  portfolio: async (signal) =>
    unwrap(await userApi.get("/orders/portfolio/summary", { signal })),
  pnl: async (signal) =>
    unwrap(await userApi.get("/orders/pnl/summary", { signal })),
  place: async (values) =>
    unwrap(
      await userApi.post(
        `/orders/${values.side === "BUY" ? "buy" : "sell"}`,
        orderPayload(values),
      ),
    ),
};
