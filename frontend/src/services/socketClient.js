import { io } from "socket.io-client";
import { readSession } from "./session.js";
// Thin, connection-lifecycle-only wrapper around the backend's documented
// Socket.IO contract (price:update / candle:update, subscribe:stocks /
// unsubscribe:stocks). Subscriber/quote bookkeeping lives in
// marketPollingService.js; this module only owns the single shared socket.
function resolveSocketUrl() {
  const base = import.meta.env?.VITE_API_BASE_URL || "http://91.108.110.56/api";
  return base.replace(/\/api\/?$/, "");
}
let socket = null;
// token -> number of independent subscribers currently wanting it. Multiple
// unrelated callers (e.g. the user-facing quote service and the admin
// instrument browser) can legitimately want the same token at once; only
// drop the server-side subscription once nobody wants it any more.
const tokenRefCounts = new Map();
const priceListeners = new Set();
const statusListeners = new Set();
function emitStatus(status) {
  statusListeners.forEach((fn) => fn(status));
}
function resolveAuthToken() {
  // The socket carries only public market data, so either an authenticated
  // user or admin session is sufficient — prefer whichever is present.
  return (
    readSession("user")?.accessToken || readSession("admin")?.accessToken
  );
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
    auth: (cb) => cb({ token: resolveAuthToken() }),
  });
  socket.on("connect", () => {
    if (tokenRefCounts.size)
      socket.emit("subscribe:stocks", [...tokenRefCounts.keys()]);
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
  if (!wanted.length) return;
  const newlyWanted = [];
  for (const t of wanted) {
    const count = tokenRefCounts.get(t) ?? 0;
    if (count === 0) newlyWanted.push(t);
    tokenRefCounts.set(t, count + 1);
  }
  if (!newlyWanted.length) return;
  const s = ensureSocket();
  if (s.connected) s.emit("subscribe:stocks", newlyWanted);
}
export function unsubscribeTokens(tokens) {
  const released = [];
  for (const t of tokens) {
    if (!t || !tokenRefCounts.has(t)) continue;
    const count = tokenRefCounts.get(t) - 1;
    if (count <= 0) {
      tokenRefCounts.delete(t);
      released.push(t);
    } else tokenRefCounts.set(t, count);
  }
  if (!released.length) return;
  if (socket?.connected) socket.emit("unsubscribe:stocks", released);
}
export function disconnectSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  tokenRefCounts.clear();
}
if (typeof window !== "undefined") {
  // Drop the connection once neither an authenticated user nor admin
  // session remains, instead of leaving it idling with no valid context.
  window.addEventListener("tbk:session", (event) => {
    if (event.detail.role !== "user" && event.detail.role !== "admin") return;
    if (!resolveAuthToken()) disconnectSocket();
  });
}
