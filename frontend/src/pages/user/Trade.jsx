import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  TextField,
  useMediaQuery,
} from "@mui/material";
import { ArrowLeft, X } from "lucide-react";
import { useQuery } from "../../hooks/useQuery";
import { useQuote } from "../../hooks/useQuotes";
import { stockService, intervals } from "../../services/stockService";
import { watchlistService } from "../../services/watchlistService";
import { orderService } from "../../services/orderService";
import { formatINR, formatPercent, pnlClass } from "../../utils/format";
import { QueryState } from "../../components/Feedback";
import { StatCards, portfolioFields } from "../../components/DataView";
import StockList from "../../components/StockList";
import TradingChart from "../../components/TradingChart";
import OrderTicket from "../../components/OrderTicket";
function localDate(date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .replace(" ", "T");
}
export default function Trade() {
  const { stockId } = useParams();
  const mobile = useMediaQuery("(max-width: 767px)");
  const instrument = useQuery(
    (signal) => stockService.get(stockId, signal),
    [stockId],
  );
  const watchlist = useQuery((signal) => watchlistService.list(signal));
  const portfolio = useQuery((signal) => orderService.portfolio(signal));
  const positions = useQuery((signal) => orderService.open(signal), [stockId]);
  const quote = useQuote(stockId, instrument.data);
  const [interval, setInterval] = useState("FIVE_MINUTE");
  const [range, setRange] = useState({
    from: localDate(new Date(Date.now() - 3 * 86400000)),
    to: localDate(new Date()),
  });
  const [draft, setDraft] = useState(range);
  const [sheet, setSheet] = useState(null);
  const history = useQuery(
    (signal) =>
      stockService.historical(
        stockId,
        {
          interval,
          fromdate: range.from.replace("T", " "),
          todate: range.to.replace("T", " "),
        },
        signal,
      ),
    [stockId, interval, range.from, range.to],
  );
  return (
    <div className="trade-page">
      <Link to="/market" className="back-link">
        <ArrowLeft size={15} />
        Market
      </Link>
      <QueryState query={instrument}>
        <div className="trade-heading">
          <div>
            <h1>{instrument.data?.symbol}</h1>
            <p>
              {instrument.data?.name}{" "}
              <span className="status-chip">{instrument.data?.exchange}</span>
            </p>
          </div>
          <div className="trade-price">
            <strong>{formatINR(quote?.ltp ?? instrument.data?.ltp)}</strong>
            <span
              className={pnlClass(
                quote?.changePercent ?? instrument.data?.changePercent,
              )}
            >
              {formatPercent(
                quote?.changePercent ?? instrument.data?.changePercent,
              )}
            </span>
            <small>
              {quote?.stale ? "Last available price" : "Latest price"}
            </small>
          </div>
        </div>
        <div className="trade-workspace">
          <aside className="surface trade-watchlist">
            <div className="section-heading">
              <h2>Watchlist</h2>
              <Link to="/watchlist">View</Link>
            </div>
            <QueryState
              query={watchlist}
              empty={!watchlist.data?.rows?.length}
              emptyTitle="No instruments"
              emptyText="Build your watchlist from Market."
            >
              <StockList
                compact
                rows={watchlist.data?.rows?.slice(0, 8) || []}
              />
            </QueryState>
          </aside>
          <section className="surface chart-panel">
            <QueryState
              query={history}
              skeleton="chart"
              empty={!history.data?.length}
              emptyTitle="No candle data available"
              emptyText="Historical data will appear when the market data provider is available."
              action={<Button onClick={history.retry}>Retry history</Button>}
            >
              <TradingChart
                candles={history.data || []}
                quote={quote}
                interval={interval}
              />
            </QueryState>
            <div className="timeframes">
              {intervals.map((i) => (
                <button
                  key={i.value}
                  className={interval === i.value ? "active" : ""}
                  onClick={() => setInterval(i.value)}
                >
                  {i.label}
                </button>
              ))}
            </div>
            <details className="chart-range-details">
              <summary>Date range</summary>
              <form
                className="chart-range"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (draft.from && draft.to && draft.from < draft.to)
                    setRange(draft);
                }}
              >
                <TextField
                  label="From (IST)"
                  size="small"
                  type="datetime-local"
                  value={draft.from}
                  onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="To (IST)"
                  size="small"
                  type="datetime-local"
                  value={draft.to}
                  onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Button
                  type="submit"
                  disabled={!draft.from || !draft.to || draft.from >= draft.to}
                >
                  Apply
                </Button>
              </form>
            </details>
            <div className="instrument-stats">
              {["open", "high", "low", "close"]
                .filter((key) => instrument.data?.[key] !== undefined)
                .map((key) => (
                  <div key={key}>
                    <span>{key}</span>
                    <strong>{formatINR(instrument.data[key])}</strong>
                  </div>
                ))}
            </div>
          </section>
          <aside className="surface desktop-ticket">
            {instrument.data && (
              <OrderTicket
                key={stockId}
                stock={instrument.data}
                quote={quote}
              />
            )}
          </aside>
        </div>
        <section className="surface trade-position-info">
          <div className="section-heading">
            <h2>Your position</h2>
            <Link to="/positions">All positions</Link>
          </div>
          <QueryState query={positions}>
            {(positions.data?.rows ?? [])
              .filter((r) => (r.stockId ?? r.stock?.id) === stockId)
              .map((r, i) => (
                <dl className="detail-list" key={r.id ?? i}>
                  <div>
                    <dt>Quantity</dt>
                    <dd>{r.quantity}</dd>
                  </div>
                  <div>
                    <dt>Average price</dt>
                    <dd>{formatINR(r.avgBuyPrice)}</dd>
                  </div>
                  <div>
                    <dt>Unrealized P&L</dt>
                    <dd className={pnlClass(r.unrealizedPnl)}>
                      {formatINR(r.unrealizedPnl)}
                    </dd>
                  </div>
                </dl>
              ))}
            {!(positions.data?.rows ?? []).some(
              (r) => (r.stockId ?? r.stock?.id) === stockId,
            ) && <p>No open position in this instrument.</p>}
          </QueryState>
        </section>
        <QueryState query={portfolio} skeleton="metrics">
          <StatCards data={portfolio.data} fields={portfolioFields} />
        </QueryState>
        <div className="mobile-trade-actions">
          <Button
            className="sell"
            variant="contained"
            onClick={() => setSheet("SELL")}
          >
            SELL
          </Button>
          <Button
            className="buy"
            variant="contained"
            onClick={() => setSheet("BUY")}
          >
            BUY
          </Button>
        </div>
        {mobile ? (
          <Drawer
            anchor="bottom"
            open={Boolean(sheet)}
            onClose={() => setSheet(null)}
            className="order-sheet"
            slotProps={{ paper: { className: "mobile-bottom-sheet" } }}
          >
            <div className="sheet-handle" aria-hidden="true" />
            <div className="sheet-header">
              <span>
                {instrument.data?.symbol || "Paper order"}
                <small>{formatINR(quote?.ltp ?? instrument.data?.ltp)}</small>
              </span>
              <IconButton
                aria-label="Close order sheet"
                onClick={() => setSheet(null)}
              >
                <X size={17} />
              </IconButton>
            </div>
            <div className="sheet-body">
              {instrument.data && sheet && (
                <OrderTicket
                  key={`${stockId}-${sheet}`}
                  stock={instrument.data}
                  quote={quote}
                  initialSide={sheet}
                />
              )}
            </div>
          </Drawer>
        ) : (
          <Dialog
            open={Boolean(sheet)}
            onClose={() => setSheet(null)}
            fullWidth
            maxWidth="xs"
            className="order-sheet"
          >
            <DialogTitle>
              <span>
                {instrument.data?.symbol || "Paper order"}
                <small
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "var(--muted)",
                  }}
                >
                  {formatINR(quote?.ltp ?? instrument.data?.ltp)}
                </small>
              </span>
              <IconButton
                aria-label="Close order sheet"
                onClick={() => setSheet(null)}
                sx={{ float: "right" }}
              >
                <X size={17} />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              {instrument.data && sheet && (
                <OrderTicket
                  key={`${stockId}-${sheet}`}
                  stock={instrument.data}
                  quote={quote}
                  initialSide={sheet}
                />
              )}
            </DialogContent>
          </Dialog>
        )}
      </QueryState>
    </div>
  );
}
