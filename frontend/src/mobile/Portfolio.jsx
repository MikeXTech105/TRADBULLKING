import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { ArrowUpDown, CircleX, SlidersHorizontal } from "lucide-react";
import { useQuery } from "../hooks/useQuery";
import { useQuotes } from "../hooks/useQuotes";
import useAutoRefresh from "../hooks/useAutoRefresh";
import { orderService } from "../services/orderService";
import { getProfile } from "../services/authService";
import { errorMessage } from "../services/api";
import { store, invalidate } from "../store/store";
import { ConfirmDialog } from "../components/DataView";
import { toastError, toastInfo, toastSuccess } from "../services/toastService";
import { hasNumber } from "../utils/format";
import { MobileEmpty, PillTabs, Toggle } from "./Parts";
import {
  baseName,
  exchangeGroup,
  expiryDate,
  expiryLabel,
  grouped,
  num,
  stockOf,
} from "./util";

const FILTERS = ["NSE", "MCX", "NOPT", "GLOBAL"];
const FILTER_LABELS = {
  NSE: "NSE",
  MCX: "MCX",
  NOPT: "NSEOPT",
  GLOBAL: "GLOBALFUTURE",
};
const idOf = (r) => r.stockId ?? r.stock?.id ?? r.stock?._id;
const tone = (v) => (Number(v) < 0 ? "down" : Number(v) > 0 ? "up" : "");

export default function MobilePortfolio() {
  const user = useSelector((s) => s.auth.user);
  const [tab, setTab] = useState("open");
  const [checked, setChecked] = useState([]);
  const [sortByPnl, setSortByPnl] = useState(false);
  const [toggle, setToggle] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const query = useQuery(
    (signal) =>
      tab === "open"
        ? orderService.open(signal)
        : orderService.closed({ page: 1, limit: 50 }, signal),
    [tab],
  );
  const summary = useQuery((signal) => orderService.portfolio(signal));
  useAutoRefresh(query, 10000, tab === "open");
  useAutoRefresh(summary, 15000);
  const all = query.data?.rows ?? [];
  const quotes = useQuotes(tab === "open" ? all.slice(0, 20).map(idOf) : []);
  const pnlOf = (r) => (tab === "open" ? r.unrealizedPnl : r.realizedPnl);
  const rows = useMemo(() => {
    const filtered = all.filter(
      (r) =>
        !checked.length ||
        checked.includes(exchangeGroup(r.exchange ?? r.stock?.exchange)),
    );
    return sortByPnl
      ? [...filtered].sort(
          (a, b) => Number(pnlOf(b) ?? 0) - Number(pnlOf(a) ?? 0),
        )
      : filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, checked, sortByPnl, tab]);
  const total =
    tab === "open" && hasNumber(summary.data?.totalUnrealizedPnl)
      ? Number(summary.data.totalUnrealizedPnl)
      : rows.reduce(
          (sum, r) => sum + (hasNumber(pnlOf(r)) ? Number(pnlOf(r)) : 0),
          0,
        );

  async function closePositions(targets) {
    setBusy(true);
    let failed = 0;
    for (const r of targets) {
      try {
        await orderService.place({
          stockId: idOf(r),
          side: "SELL",
          quantity: r.quantity,
          priceType: "MARKET",
        });
      } catch (e) {
        failed++;
        toastError(
          errorMessage(e, `Unable to close ${r.symbol ?? "position"}.`),
          { id: `close-${idOf(r)}` },
        );
      }
    }
    store.dispatch(invalidate());
    getProfile().catch(() => {});
    if (failed < targets.length)
      toastSuccess(targets.length > 1 ? "Positions closed." : "Position closed.", {
        id: "close-positions",
      });
    setBusy(false);
    setConfirm(null);
  }

  return (
    <div className="m-screen-body">
      <header className="m-header m-header-portfolio">
        <div className="m-header-row">
          <h1>Portfolio</h1>
          <div className="m-header-actions">
            <button
              className="m-btn red"
              disabled={!rows.length || tab !== "open"}
              onClick={() => setConfirm({ all: true })}
            >
              Close All
            </button>
            <button
              className="m-btn blue"
              onClick={() =>
                toastInfo("Roll over is not available for paper trading.", {
                  id: "roll-over",
                })
              }
            >
              Roll Over
            </button>
            <Toggle checked={toggle} onChange={setToggle} label="Toggle" />
          </div>
        </div>
        <div className="m-limit">
          <span>Limit</span>
          <strong>{grouped(user?.dummyBalance, 0)}</strong>
        </div>
        <div className="m-pnl-bar">
          <span>Current PNL</span>
          <strong className={tone(total)}>{total.toFixed(2)}</strong>
        </div>
      </header>
      <div className="m-positions-head">
        <h2>Positions</h2>
        <PillTabs
          value={tab}
          onChange={setTab}
          tabs={[
            ["open", "Valanwise"],
            ["closed", "Daywise"],
          ]}
        />
        <button
          className="m-square-btn"
          aria-label="Clear filters"
          onClick={() => setChecked([])}
        >
          <SlidersHorizontal size={20} />
        </button>
        <button
          className="m-square-btn"
          aria-label="Sort by profit"
          aria-pressed={sortByPnl}
          onClick={() => setSortByPnl((v) => !v)}
        >
          <ArrowUpDown size={20} />
        </button>
      </div>
      <div className="m-filter-row">
        {FILTERS.map((f) => (
          <label key={f}>
            <input
              type="checkbox"
              checked={checked.includes(f)}
              onChange={() =>
                setChecked((c) =>
                  c.includes(f) ? c.filter((x) => x !== f) : [...c, f],
                )
              }
            />
            <i />
            {FILTER_LABELS[f]}
          </label>
        ))}
      </div>
      <div className="m-pos-list">
        <MobileEmpty
          query={query}
          empty={!rows.length}
          text={tab === "open" ? "No open positions." : "No closed positions."}
        >
          {rows.map((r, i) => {
            const stock = stockOf(r);
            const id = idOf(r);
            const q = quotes[id];
            const ltp = q?.ltp ?? r.currentPrice;
            const pnl = pnlOf(r);
            const pct = q?.changePercent ?? stock?.changePercent;
            return (
              <article className="m-pos" key={r.id ?? i}>
                <div className="m-pos-top">
                  <label>
                    <input type="checkbox" aria-label="Select position" />
                    <i />
                    {baseName({ ...stock, symbol: r.symbol ?? stock?.symbol })}{" "}
                    {expiryLabel(stock)}
                  </label>
                  <span>Avg. : {num(r.avgBuyPrice)}</span>
                </div>
                <div className="m-pos-mid">
                  <span>
                    <b className="buy">BUY</b> ({Number(r.quantity).toFixed(1)})
                  </span>
                  <strong className={tone(pnl)}>{num(pnl)}</strong>
                </div>
                <div className="m-pos-bottom">
                  {tab === "open" ? (
                    <button
                      className="m-close"
                      onClick={() => setConfirm({ row: r })}
                    >
                      <CircleX size={18} fill="#f5222d" color="#fff" />
                      Close Position
                      {expiryDate(stock) ? `(${expiryDate(stock)})` : ""}
                    </button>
                  ) : (
                    <span />
                  )}
                  <span className="m-pos-ltp">
                    <span className="up">
                      LTP : {num(ltp)}
                      {hasNumber(pct)
                        ? ` (${Math.abs(Number(pct)).toFixed(2)} %)`
                        : ""}
                    </span>
                    {id && (
                      <Link to={`/trade/${encodeURIComponent(id)}`}>Trades</Link>
                    )}
                  </span>
                </div>
              </article>
            );
          })}
        </MobileEmpty>
      </div>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.all ? "Close all positions?" : "Close this position?"}
        description={
          confirm?.all
            ? "A market sell order will be placed for every open position listed."
            : "A market sell order will be placed for the full quantity."
        }
        onClose={() => setConfirm(null)}
        onConfirm={() => closePositions(confirm?.all ? rows : [confirm.row])}
        busy={busy}
      />
    </div>
  );
}
