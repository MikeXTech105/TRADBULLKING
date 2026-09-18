import { io } from "socket.io-client";
import { readSession } from "./session.js";
// Thin, connection-lifecycle-only wrapper around the backend's documented
// Socket.IO contract (price:update / candle:update, subscribe:stocks /
// unsubscribe:stocks). Subscriber/quote bookkeeping lives in
// marketPollingService.js; this module only owns the single shared socket.
function resolveSocketUrl() {
  const base =
    import.meta.env?.VITE_API_BASE_URL || "https://tradbullking.onrender.com/api";
  return base.replace(/\/api\/?$/, "");
}
let socket = null;
const subscribedTokens = new Set();
const priceListeners = new Set();
const statusListeners = new Set();
function emitStatus(status) {
  statusListeners.forEach((fn) => fn(status));
}
function ensureSocket() {
  if (socket) return socket;
  socket = io(resolveSocketUrl(), {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    // Evaluated fresh on every (re)connect attempt, so a token refreshed
    // after the socket was created is still picked up without a forced
    // reconnect on every refresh.
    auth: (cb) => cb({ token: readSession("user")?.accessToken }),
  });
  socket.on("connect", () => {
    if (subscribedTokens.size)
      socket.emit("subscribe:stocks", [...subscribedTokens]);
    emitStatus("connected");
  });
  socket.on("disconnect", () => emitStatus("disconnected"));
  socket.on("connect_error", () => emitStatus("error"));
  socket.on("price:update", (payload) =>
    priceListeners.forEach((fn) => fn(payload)),
  );
  return socket;
}
export function onPriceUpdate(fn) {
  priceListeners.add(fn);
  return () => priceListeners.delete(fn);
}
export function onStatusChange(fn) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}
export function isConnected() {
  return Boolean(socket?.connected);
}
export function subscribeTokens(tokens) {
  const wanted = tokens.filter(Boolean);
  const fresh = wanted.filter((t) => !subscribedTokens.has(t));
  if (!fresh.length) return;
  fresh.forEach((t) => subscribedTokens.add(t));
  const s = ensureSocket();
  if (s.connected) s.emit("subscribe:stocks", fresh);
}
export function unsubscribeTokens(tokens) {
  const toRemove = tokens.filter((t) => t && subscribedTokens.has(t));
  if (!toRemove.length) return;
  toRemove.forEach((t) => subscribedTokens.delete(t));
  if (socket?.connected) socket.emit("unsubscribe:stocks", toRemove);
}
export function disconnectSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  subscribedTokens.clear();
}
if (typeof window !== "undefined") {
  // The live feed is only meaningful for an authenticated user session; drop
  // the connection immediately on logout instead of leaving it idling.
  window.addEventListener("tbk:session", (event) => {
    if (event.detail.role === "user" && !event.detail.session?.accessToken)
      disconnectSocket();
  });
}
