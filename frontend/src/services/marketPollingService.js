import { stockService } from "./stockService.js";
import { store, quoteReceived } from "../store/store";
import { getTokenForId, getIdForToken } from "./instrumentRegistry.js";
import {
  onPriceUpdate,
  onStatusChange,
  subscribeTokens,
  unsubscribeTokens,
} from "./socketClient.js";
// One shared, non-overlapping delivery layer for live quotes. The real-time
// Socket.IO feed (price:update, keyed by provider token) is the primary
// source; REST LTP polling is a per-entry fallback used only while an entry
// has no known token yet, or while the socket is unhealthy/not yet proven
// connected. Both paths feed the same quoteReceived action, so every
// consumer (chart, watchlist rows, positions, trade header) is unaffected
// by which source is currently active.
const entries = new Map();
let timer = null;
let inFlight = false;
let controller = null;
let wsHealthy = false;
function schedule(delay = 250) {
  if (timer || !entries.size) return;
  timer = setTimeout(tick, delay);
}
function wsCoveredEntry(id) {
  return wsHealthy && Boolean(getTokenForId(id));
}
async function tick() {
  timer = null;
  if (inFlight || document.hidden || !entries.size) return;
  inFlight = true;
  controller = new AbortController();
  const now = Date.now();
  const due = [...entries]
    .filter(([id, entry]) => entry.next <= now && !wsCoveredEntry(id))
    .sort((a, b) => a[1].next - b[1].next)
    .slice(0, 3);
  await Promise.all(
    due.map(async ([id, entry]) => {
      const rate = Math.min(...entry.subscribers.values());
      entry.next = Date.now() + rate;
      try {
        const quote = await stockService.ltp(id, controller.signal);
        if (entries.has(id) && !controller.signal.aborted) {
          store.dispatch(quoteReceived({ ...quote, stale: false }));
          entry.failures = 0;
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          entry.failures++;
          entry.next =
            Date.now() +
            Math.min(60000, rate * 2 ** Math.min(entry.failures, 4));
          store.dispatch(quoteReceived({ id, stale: true }));
        }
      }
    }),
  );
  inFlight = false;
  controller = null;
  schedule(250);
}
function stopPolling() {
  if (timer) clearTimeout(timer);
  timer = null;
  controller?.abort();
}
function syncTokenSubscriptions() {
  const tokens = [...entries.keys()].map(getTokenForId).filter(Boolean);
  if (tokens.length) subscribeTokens(tokens);
}
onStatusChange((status) => {
  const wasHealthy = wsHealthy;
  wsHealthy = status === "connected";
  if (wsHealthy && !wasHealthy) {
    // Newly (re)connected: re-subscribe every currently wanted token and
    // let due polling entries stand down at the next tick.
    syncTokenSubscriptions();
  }
});
onPriceUpdate((payload) => {
  const id = getIdForToken(payload.token);
  if (!id || !entries.has(id)) return;
  store.dispatch(
    quoteReceived({
      id,
      ltp: payload.ltp,
      change: payload.change,
      changePercent: payload.changePercent,
      high: payload.high,
      low: payload.low,
      open: payload.open,
      close: payload.close,
      timestamp: new Date().toISOString(),
      stale: false,
    }),
  );
  const entry = entries.get(id);
  entry.failures = 0;
});
if (typeof document !== "undefined")
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopPolling();
    else {
      for (const entry of entries.values()) entry.next = 0;
      schedule();
    }
  });
export function subscribeQuotes(ids, rate = 5000) {
  const subscriber = Symbol();
  const wantedIds = [...new Set(ids.filter(Boolean))];
  for (const id of wantedIds) {
    let entry = entries.get(id);
    if (!entry) {
      entry = { subscribers: new Map(), next: 0, failures: 0 };
      entries.set(id, entry);
    }
    entry.subscribers.set(subscriber, rate);
  }
  syncTokenSubscriptions();
  schedule();
  return () => {
    const releasedTokens = [];
    for (const [id, entry] of entries) {
      entry.subscribers.delete(subscriber);
      if (!entry.subscribers.size) {
        const token = getTokenForId(id);
        if (token) releasedTokens.push(token);
        entries.delete(id);
      }
    }
    if (releasedTokens.length) unsubscribeTokens(releasedTokens);
    if (!entries.size) stopPolling();
  };
}
