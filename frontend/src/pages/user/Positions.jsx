import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@mui/material";
import { useQuery } from "../../hooks/useQuery";
import { useQuotes } from "../../hooks/useQuotes";
import useAutoRefresh from "../../hooks/useAutoRefresh";
import { orderService } from "../../services/orderService";
import { formatINR, formatPnl, pnlClass } from "../../utils/format";
import { PageHeader, DataTable, Pagination } from "../../components/DataView";
import { QueryState } from "../../components/Feedback";
export default function Positions() {
  const [tab, setTab] = useState("open");
  const [page, setPage] = useState(1);
  const query = useQuery(
    (signal) =>
      tab === "open"
        ? orderService.open(signal)
        : orderService.closed({ page, limit: 20 }, signal),
    [tab, page],
  );
  const rows = query.data?.rows ?? [];
  useAutoRefresh(query, 10000, tab === "open");
  const quotes = useQuotes(
    tab === "open"
      ? rows.slice(0, 10).map((r) => r.stockId ?? r.stock?.id ?? r.stock?._id)
      : [],
  );
  const columns = [
    {
      key: "symbol",
      label: "Instrument",
      render: (r) => (
        <div className="instrument-cell">
          <strong>{r.symbol ?? r.stock?.symbol ?? "—"}</strong>
          <small>{r.exchange ?? r.stock?.exchange}</small>
        </div>
      ),
    },
    { key: "quantity", label: "Quantity" },
    {
      key: "avgBuyPrice",
      label: "Average price",
      render: (r) => formatINR(r.avgBuyPrice),
    },
    {
      key: "currentPrice",
      label: "LTP",
      render: (r) => formatINR(quotes[r.stockId]?.ltp ?? r.currentPrice),
    },
    {
      key: "investedAmount",
      label: "Invested",
      render: (r) => formatINR(r.investedAmount),
    },
    {
      key: "pnl",
      label: tab === "open" ? "Unrealized P&L" : "Realized P&L",
      render: (r) => (
        <span
          className={pnlClass(tab === "open" ? r.unrealizedPnl : r.realizedPnl)}
        >
          {formatPnl(tab === "open" ? r.unrealizedPnl : r.realizedPnl)}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (r) =>
        (r.stockId ?? r.stock?.id ?? r.stock?._id) ? (
          <Button
            component={Link}
            to={`/trade/${r.stockId ?? r.stock?.id ?? r.stock?._id}`}
            size="small"
          >
            Trade
          </Button>
        ) : (
          "—"
        ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Positions"
        description="Stay close to your exposure."
      />
      <section className="surface">
        <div className="toolbar">
          <div className="tab-buttons">
            {["open", "closed"].map((x) => (
              <button
                key={x}
                className={tab === x ? "active" : ""}
                onClick={() => {
                  setTab(x);
                  setPage(1);
                }}
              >
                {x === "open" ? "Open positions" : "Closed positions"}
              </button>
            ))}
          </div>
          <span className="subtle-label">P&L calculated by backend</span>
        </div>
        <QueryState
          query={query}
          empty={!rows.length}
          emptyTitle={`No ${tab} positions yet`}
          emptyText="Your trading positions will be shown here."
        >
          <DataTable rows={rows} columns={columns} />
        </QueryState>
        {tab === "closed" && (
          <Pagination page={page} onChange={setPage} data={query.data} />
        )}
      </section>
    </>
  );
}
