import { useEffect } from "react";
export default function useAutoRefresh(
  query,
  interval = 10000,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    let timer;
    const refresh = () => {
      clearTimeout(timer);
      if (!document.hidden && !query.loading) query.retry();
    };
    if (!query.loading && !document.hidden)
      timer = setTimeout(refresh, interval);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [query.loading, query.retry, interval, enabled]);
}
