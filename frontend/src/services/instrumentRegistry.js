// Bidirectional stockId <-> provider token map, passively populated whenever
// a Stock-shaped API response flows through adapters.identify(). This lets
// live-market subscriptions (keyed by provider token, per the WebSocket
// contract) resolve back to the internal stockId that the rest of the app
// keys quotes by, without changing any call site's function signature.
const idToToken = new Map();
const tokenToId = new Map();
const listeners = new Set();
export function registerInstrument(id, token) {
  if (!id || !token) return;
  const value = String(token);
  const isNew = idToToken.get(id) !== value;
  idToToken.set(id, value);
  tokenToId.set(value, id);
  // Live-quote subscriptions can start before a stock's token is known yet
  // (e.g. the Trade page subscribes to the LTP feed as soon as it mounts,
  // ahead of its own /stocks/{id} fetch resolving). Notify listeners so a
  // pending WebSocket subscription can be completed once the token arrives,
  // instead of silently falling back to polling forever.
  if (isNew) listeners.forEach((fn) => fn(id, value));
}
export function onInstrumentRegistered(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export const getTokenForId = (id) => idToToken.get(id);
export const getIdForToken = (token) => tokenToId.get(String(token));
