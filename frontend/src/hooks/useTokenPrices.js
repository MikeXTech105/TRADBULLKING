import { useEffect, useState } from "react";
import {
  onPriceUpdate,
  subscribeTokens,
  unsubscribeTokens,
} from "../services/socketClient.js";
// Live prices keyed directly by AngelOne provider token, for instruments
// that have no TRADBULLKING stockId yet (the admin instrument browser deals
// in raw provider catalogue entries, not onboarded Stock records) — so this
// bypasses marketPollingService's stockId-keyed quote store and talks to
// the shared socket connection's token-level subscription API directly.
// There is no REST fallback here: this screen is metadata browsing, not a
// trading surface, so a price simply stays unknown until a tick arrives.
export function useTokenPrices(tokens) {
  const signature = [...new Set(tokens.filter(Boolean))].sort().join(",");
  const [prices, setPrices] = useState({});
  useEffect(() => {
    const list = signature ? signature.split(",") : [];
    if (!list.length) return undefined;
    subscribeTokens(list);
    const unsubscribe = onPriceUpdate((payload) => {
      if (!list.includes(payload.token)) return;
      setPrices((previous) => ({ ...previous, [payload.token]: payload }));
    });
    return () => {
      unsubscribe();
      unsubscribeTokens(list);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return prices;
}
