import { useEffect, useState, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
export function useQuery(loader, dependencies = [], invalidate = true) {
  const revision = useSelector((state) =>
    invalidate ? state.data.revision : 0,
  );
  const [attempt, setAttempt] = useState(0);
  const queryKey = JSON.stringify(dependencies);
  const lastKey = useRef(null);
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
    slow: false,
  });
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    const changed = lastKey.current !== queryKey;
    lastKey.current = queryKey;
    setState((previous) => ({
      ...previous,
      data: changed ? null : previous.data,
      loading: true,
      error: null,
      slow: false,
    }));
    const timer = setTimeout(() => {
      if (!controller.signal.aborted)
        setState((previous) => ({ ...previous, slow: true }));
    }, 5000);
    Promise.resolve()
      .then(() => loader(controller.signal))
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ data, loading: false, error: null, slow: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState((previous) => ({
            ...previous,
            loading: false,
            error,
            slow: false,
          }));
      })
      .finally(() => clearTimeout(timer));
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // Callers explicitly supply the values that determine their query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, attempt, revision]);
  return { ...state, retry };
}
export function useDebounce(value, delay = 350) {
  const [result, setResult] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setResult(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return result;
}
