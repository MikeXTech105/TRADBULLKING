import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Monitor, Plus, SlidersHorizontal, X } from "lucide-react";
import { useQuery } from "../hooks/useQuery";
import { useQuote, useQuotes } from "../hooks/useQuotes";
import { watchlistService } from "../services/watchlistService";
import { stockService } from "../services/stockService";
import { errorMessage } from "../services/api";
import { store, invalidate } from "../store/store";
import { toastError, toastSuccess } from "../services/toastService";
import { hasNumber } from "../utils/format";
import { validStockId } from "../services/stockIdentity";
import { MobileEmpty, Toggle } from "./Parts";
import OrderSheet from "./OrderSheet";
import { baseName, expiryLabel, grouped, num } from "./util";

// Index prices come from the backend instrument catalogue (admin must enable the index
// instruments). Try exact symbol lookups first, then a catalogue search.
const INDEX_TERMS = {
  "NIFTY 50": ["NIFTY 50", "NIFTY50", "NIFTY"],
  SENSEX: ["SENSEX", "BSE SENSEX"],
};
const indexCache = new Map();
async function findIndex(label, signal) {
  if (indexCache.has(label)) return indexCache.get(label);
  const terms = INDEX_TERMS[label] ?? [label];
  const norm = (v) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const wanted = terms.map(norm);
  let found = null;
  for (const term of terms) {
    try {
      const hit = await stockService.symbol(term);
      if (validStockId(hit?.id)) {
        found = hit;
        break;
      }
    } catch {
      /* try the next spelling */
    }
    if (signal.aborted) return null;
  }
  if (!found) {
    for (const term of terms) {
      try {
        const result = await stockService.search({ q: term }, signal);
        const rows = result.rows.filter((r) => validStockId(r.id));
        found =
          rows.find((r) => wanted.includes(norm(r.symbol)) || wanted.includes(norm(r.name))) ??
          rows.find((r) => /INDEX|IDX/i.test(String(r.instrumenttype ?? r.type ?? ""))) ??
          null;
        if (found) break;
      } catch {
        /* try the next spelling */
      }
      if (signal.aborted) return null;
    }
  }
  if (found) indexCache.set(label, found);
  return found;
}
function useIndexStock(label) {
  const [stock, setStock] = useState(indexCache.get(label) ?? null);
  useEffect(() => {
    const controller = new AbortController();
    findIndex(label, controller.signal).then((hit) => {
      if (hit && !controller.signal.aborted) setStock(hit);
    });
    return () => controller.abort();
  }, [label]);
  return stock;
}

function IndexCell({ label }) {
  const stock = useIndexStock(label);
  const quote = useQuote(stock?.id, stock ?? undefined);
  const ltp = quote?.ltp ?? stock?.ltp;
  const close = quote?.close ?? stock?.close;
  const change =
    quote?.change ??
    stock?.change ??
    (hasNumber(ltp) && hasNumber(close) ? Number(ltp) - Number(close) : undefined);
  const percent =
    quote?.changePercent ??
    stock?.changePercent ??
    (hasNumber(change) && hasNumber(close) && Number(close) !== 0
      ? (Number(change) / Number(close)) * 100
      : undefined);
  const cls = Number(percent) < 0 || Number(change) < 0 ? "down" : "up";
  return (
    <div className="m-index-cell">
      <span>{label}</span>
      <div>
        <strong>{hasNumber(ltp) ? num(ltp) : "0.0"}</strong>
        <small className={cls}>
          {hasNumber(change) ? num(change) : "0.0"} (
          {hasNumber(percent) ? Math.abs(Number(percent)).toFixed(2) : "0.00"}%)
        </small>
      </div>
    </div>
  );
}

function Row({ stock, quote, editing, busy, onOpen, onRemove }) {
  const ltp = quote?.ltp ?? stock.ltp;
  const low = quote?.low ?? stock.low;
  const high = quote?.high ?? stock.high;
  const bid = quote?.bid ?? ltp;
  const ask = quote?.ask ?? ltp;
  const percent = quote?.changePercent ?? stock.changePercent;
  const change =
    quote?.change ??
    stock.change ??
    (hasNumber(ltp) && hasNumber(quote?.close ?? stock.close)
      ? Number(ltp) - Number(quote?.close ?? stock.close)
      : undefined);
  const down = Number(percent) < 0 || Number(change) < 0;
  return (
    <div className="m-wl-row" role="button" tabIndex={0} onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}>
      <div className="m-wl-left">
        <small>
          Low : <span>{num(low)}</span>
        </small>
        <strong>{baseName(stock)}</strong>
        <em>{expiryLabel(stock) || stock.exchange}</em>
        <b>Qty : {stock.qty ?? 0}</b>
      </div>
      <div className="m-wl-mid">
        <small>
          LTP : <span>{num(ltp)}</span>
        </small>
        <strong>{num(bid)}</strong>
      </div>
      <div className="m-wl-right">
        <small>
          High : <span>{num(high)}</span>
        </small>
        <strong>{num(ask)}</strong>
        {editing ? (
          <button
            className="m-wl-remove"
            disabled={busy === stock.id}
            aria-label={`Remove ${stock.symbol} from watchlist`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(stock.id);
            }}
          >
            <X size={12} /> Remove
          </button>
        ) : (
          <span className={`m-pill ${down ? "down" : "up"}`}>
            {hasNumber(change) ? num(change, 1) : "0.0"} (
            {hasNumber(percent) ? Math.abs(Number(percent)).toFixed(2) : "0.0"} %)
          </span>
        )}
      </div>
    </div>
  );
}

export default function MobileWatchlist() {
  const user = useSelector((s) => s.auth.user);
  const query = useQuery((signal) => watchlistService.list(signal));
  const [search, setSearch] = useState("");
  const [forex, setForex] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(null);
  const [selected, setSelected] = useState(null);
  const rows = useMemo(
    () =>
      (query.data?.rows ?? []).filter((r) =>
        `${r.symbol} ${r.name}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [query.data, search],
  );
  const quotes = useQuotes(
    (query.data?.rows ?? []).slice(0, 40).map((r) => r.id),
    5000,
  );
  const margin = grouped(user?.dummyBalance, 0);

  async function remove(id) {
    if (busy) return;
    setBusy(id);
    try {
      await watchlistService.remove(id);
      store.dispatch(invalidate());
      toastSuccess("Removed from watchlist.", { id: `watchlist-${id}` });
    } catch (e) {
      toastError(errorMessage(e, "Unable to update watchlist."), {
        id: `watchlist-${id}`,
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="m-screen-body">
      <header className="m-header m-header-market">
        <div className="m-margin">
          <span>NSE MARGIN</span>
          <span>
            {margin} / {margin}
          </span>
        </div>
        <div className="m-forex">
          <span>Switch ON For Forex Mode</span>
          <Toggle checked={forex} onChange={setForex} label="Forex mode" />
        </div>
        <div className="m-index-strip">
          <IndexCell label="NIFTY 50" />
          <IndexCell label="SENSEX" />
        </div>
      </header>
      <div className="m-search-row">
        <input
          type="search"
          placeholder="Search Script"
          aria-label="Search Script"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Link to="/market" aria-label="Add instrument">
          <Plus size={26} />
        </Link>
        <button
          aria-label="Edit watchlist"
          aria-pressed={editing}
          onClick={() => setEditing((v) => !v)}
        >
          <SlidersHorizontal size={24} />
        </button>
        <Link to="/dashboard" aria-label="Overview">
          <Monitor size={26} />
        </Link>
        <Link className="m-new-expiry" to="/market">
          + New Expiry
        </Link>
      </div>
      <div className="m-wl-list">
        <MobileEmpty
          query={query}
          empty={!rows.length}
          text={
            search
              ? "No matching scripts."
              : "No scripts in this list. Tap + to add instruments."
          }
        >
          {rows.map((stock) => (
            <Row
              key={stock.id}
              stock={stock}
              quote={quotes[stock.id]}
              editing={editing}
              busy={busy}
              onOpen={() => validStockId(stock.id) && setSelected(stock)}
              onRemove={remove}
            />
          ))}
        </MobileEmpty>
      </div>
      <OrderSheet stock={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
