import { configureStore, createSlice } from "@reduxjs/toolkit";
import { readSession } from "../services/session";
const auth = createSlice({
  name: "auth",
  initialState: {
    user: readSession("user")?.user ?? null,
    admin: readSession("admin")?.user ?? null,
  },
  reducers: {
    sessionChanged(state, { payload }) {
      state[payload.role] = payload.session?.user ?? null;
    },
  },
});
const market = createSlice({
  name: "market",
  initialState: { quotes: {} },
  reducers: {
    quoteReceived(state, { payload }) {
      state.quotes[payload.id] = {
        ...state.quotes[payload.id],
        ...payload,
        receivedAt: Date.now(),
      };
    },
  },
});
const data = createSlice({
  name: "data",
  initialState: { revision: 0 },
  reducers: {
    invalidate(state) {
      state.revision++;
    },
  },
});
export const { quoteReceived } = market.actions;
export const { invalidate } = data.actions;
export const store = configureStore({
  reducer: { auth: auth.reducer, market: market.reducer, data: data.reducer },
});
if (typeof window !== "undefined") {
  window.addEventListener("tbk:session", (event) =>
    store.dispatch(auth.actions.sessionChanged(event.detail)),
  );
  window.addEventListener("storage", () => {
    for (const role of ["user", "admin"])
      store.dispatch(
        auth.actions.sessionChanged({ role, session: readSession(role) }),
      );
  });
}
