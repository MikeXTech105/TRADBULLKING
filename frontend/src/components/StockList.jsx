import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Plus, X, ArrowUpRight } from "lucide-react";
import { IconButton, Tooltip } from "@mui/material";
import { useQuotes } from "../hooks/useQuotes";
import { formatINR, formatPercent, pnlClass } from "../utils/format";
import { validStockId } from "../services/stockIdentity";
export default function StockList({
  rows,
  onAdd,
  onRemove,
  busy,
  compact = false,
}) {
  const listRef = useRef(null);
  const [visibleIds, setVisibleIds] = useState([]);
  const idsKey = rows.map((r) => r.id).join("|");
  useEffect(() => {
    const visible = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.dataset.stockId;
          if (entry.isIntersecting && validStockId(id)) visible.add(id);
          else visible.delete(id);
        }
        const next = [...visible].sort();
        setVisibleIds((previous) =>
          previous.join("|") === next.join("|") ? previous : next,
        );
      },
      { rootMargin: "100px" },
    );
    listRef.current
      ?.querySelectorAll("[data-stock-id]")
      .forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, [idsKey]);
  const quotes = useQuotes(visibleIds, 5000);
  return (
    <div ref={listRef} className={`stock-list ${compact ? "compact" : ""}`}>
      <div className="stock-list-head">
        <span>Instrument</span>
        <span>Last price / Change</span>
      </div>
      {rows.map((stock, index) => {
        const available = validStockId(stock.id);
        const InstrumentLink = available ? Link : "div";
        const quote = quotes[stock.id];
        return (
          <div
            key={stock.id || `${stock.symbol}-${index}`}
            data-stock-id={available ? stock.id : undefined}
            className="stock-row"
          >
            <InstrumentLink
              className="stock-link"
              to={
                available ? `/trade/${encodeURIComponent(stock.id)}` : undefined
              }
              aria-disabled={available ? undefined : true}
            >
              <span className="instrument-cell">
                <strong>{stock.symbol ?? "—"}</strong>
                <small>
                  {stock.name ?? "Instrument"}
                  {stock.exchange && ` · ${stock.exchange}`}
                </small>
              </span>
              <span className="stock-price">
                <strong>{formatINR(quote?.ltp ?? stock.ltp)}</strong>
                {(quote?.changePercent ?? stock.changePercent) !==
                  undefined && (
                  <small
                    className={pnlClass(
                      quote?.changePercent ?? stock.changePercent,
                    )}
                  >
                    {formatPercent(quote?.changePercent ?? stock.changePercent)}
                  </small>
                )}
                {quote?.stale && <small>Last available price</small>}
              </span>
              {!available && (
                <small className="subtle-label">Unavailable for trading</small>
              )}
            </InstrumentLink>
            {onAdd && (
              <Tooltip title="Add to watchlist">
                <IconButton
                  disabled={!available || busy === stock.id}
                  aria-label={`Add ${stock.symbol} to watchlist`}
                  onClick={() => onAdd(stock.id)}
                >
                  <Plus size={17} />
                </IconButton>
              </Tooltip>
            )}
            {onRemove && (
              <Tooltip title="Remove from watchlist">
                <IconButton
                  disabled={!available || busy === stock.id}
                  aria-label={`Remove ${stock.symbol} from watchlist`}
                  onClick={() => onRemove(stock.id)}
                >
                  <X size={16} />
                </IconButton>
              </Tooltip>
            )}
            {!onAdd && !onRemove && (
              <ArrowUpRight size={16} className="stock-arrow" />
            )}
          </div>
        );
      })}
    </div>
  );
}
