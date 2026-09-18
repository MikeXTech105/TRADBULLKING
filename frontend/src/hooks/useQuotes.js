import { useEffect } from "react";
import { useSelector } from "react-redux";
import { subscribeQuotes } from "../services/marketPollingService";
export function useQuotes(ids, rate = 5000) {
  const signature = [...new Set(ids.filter(Boolean))].sort().join(",");
  useEffect(
    () => subscribeQuotes(signature ? signature.split(",") : [], rate),
    [signature, rate],
  );
  return useSelector((state) => state.market.quotes);
}
export function useQuote(id, fallback) {
  useQuotes(id ? [id] : [], 2500);
  return useSelector((state) => state.market.quotes[id]) ?? fallback;
}
