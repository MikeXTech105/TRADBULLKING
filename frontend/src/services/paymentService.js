import { load } from "@cashfreepayments/cashfree-js";
import { userApi } from "./api.js";
import { unwrap, collection } from "./adapters.js";
export const paymentService = {
  create: async () => unwrap(await userApi.post("/payments/create")),
  verify: async (id) =>
    unwrap(await userApi.post(`/payments/verify/${encodeURIComponent(id)}`)),
  get: async (id) =>
    unwrap(await userApi.get(`/payments/${encodeURIComponent(id)}`)),
  history: async (params, signal) =>
    collection(
      unwrap(await userApi.get("/payments/history", { params, signal })),
      "payments",
    ),
  checkout: async (paymentSessionId) => {
    if (!paymentSessionId) throw new Error("The payment session is missing.");
    const mode = import.meta.env.VITE_CASHFREE_MODE;
    if (!["sandbox", "production"].includes(mode))
      throw new Error(
        "Payment checkout is not configured. Please contact support.",
      );
    const sdk = await load({ mode });
    return sdk.checkout({ paymentSessionId, redirectTarget: "_modal" });
  },
};
