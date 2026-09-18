import { stockService } from "./stockService.js";
import { store, quoteReceived } from "../store/store";
// One shared, non-overlapping scheduler. No client socket contract is published.
const entries = new Map();
let timer = null;
let inFlight = false;
let controller = null;
function schedule(delay = 250) {
  if (timer || !entries.size) return;
  timer = setTimeout(tick, delay);
}
async function tick() {
  timer = null;
  if (inFlight || document.hidden || !entries.size) return;
  inFlight = true;
  controller = new AbortController();
  const now = Date.now();
  const due = [...entries]
    .filter(([, entry]) => entry.next <= now)
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
function stop() {
  if (timer) clearTimeout(timer);
  timer = null;
  controller?.abort();
}
if (typeof document !== "undefined")
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else {
      for (const entry of entries.values()) entry.next = 0;
      schedule();
    }
  });
export function subscribeQuotes(ids, rate = 5000) {
  const subscriber = Symbol();
  for (const id of [...new Set(ids.filter(Boolean))]) {
    let entry = entries.get(id);
    if (!entry) {
      entry = { subscribers: new Map(), next: 0, failures: 0 };
      entries.set(id, entry);
    }
    entry.subscribers.set(subscriber, rate);
  }
  schedule();
  return () => {
    for (const [id, entry] of entries) {
      entry.subscribers.delete(subscriber);
      if (!entry.subscribers.size) entries.delete(id);
    }
    if (!entries.size) stop();
  };
}
