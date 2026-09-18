// Bidirectional stockId <-> provider token map, passively populated whenever
// a Stock-shaped API response flows through adapters.identify(). This lets
// live-market subscriptions (keyed by provider token, per the WebSocket
// contract) resolve back to the internal stockId that the rest of the app
// keys quotes by, without changing any call site's function signature.
const idToToken = new Map();
const tokenToId = new Map();
export function registerInstrument(id, token) {
  if (!id || !token) return;
  idToToken.set(id, String(token));
  tokenToId.set(String(token), id);
}
export const getTokenForId = (id) => idToToken.get(id);
export const getIdForToken = (token) => tokenToId.get(String(token));
