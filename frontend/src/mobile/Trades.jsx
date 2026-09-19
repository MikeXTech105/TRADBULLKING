import { useState } from "react";
import { Menu, MenuItem } from "@mui/material";
import { SlidersHorizontal } from "lucide-react";
import { useQuery } from "../hooks/useQuery";
import { orderService } from "../services/orderService";
import { Pagination } from "../components/DataView";
import { MobileEmpty, MobileHeader, PillTabs, Toggle } from "./Parts";
import {
  baseName,
  expiryLabel,
  grouped,
  lotSizeOf,
  num,
  stamp,
  stockOf,
} from "./util";

export default function MobileTrades() {
  const [tab, setTab] = useState("EXECUTED");
  const [side, setSide] = useState("");
  const [page, setPage] = useState(1);
  const [anchor, setAnchor] = useState(null);
  const [toggle, setToggle] = useState(false);
  const query = useQuery(
    (signal) =>
      orderService.list(
        { page, limit: 20, status: tab, orderType: side || undefined },
        signal,
      ),
    [tab, side, page],
  );
  const rows = query.data?.rows ?? [];
  return (
    <div className="m-screen-body">
      <MobileHeader title="Trades">
        <button
          className="m-icon-btn"
          aria-label="Filter trades"
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          <SlidersHorizontal size={24} />
        </button>
        <Toggle checked={toggle} onChange={setToggle} label="Toggle" />
      </MobileHeader>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
      >
        {[
          ["", "All"],
          ["BUY", "Buy"],
          ["SELL", "Sell"],
        ].map(([value, label]) => (
          <MenuItem
            key={label}
            selected={side === value}
            onClick={() => {
              setSide(value);
              setPage(1);
              setAnchor(null);
            }}
          >
            {label}
          </MenuItem>
        ))}
      </Menu>
      <PillTabs
        className="m-trade-tabs"
        value={tab}
        onChange={(v) => {
          setTab(v);
          setPage(1);
        }}
        tabs={[
          ["EXECUTED", "Executed"],
          ["PENDING", "Pending"],
        ]}
      />
      <div className="m-trade-list">
        <MobileEmpty
          query={query}
          empty={!rows.length}
          text={tab === "PENDING" ? "No pending orders." : "No executed trades."}
        >
          {rows.map((o) => {
            const stock = stockOf(o);
            const buy = o.orderType === "BUY";
            const size = lotSizeOf({
              ...stock,
              lotSize: o.lotSize ?? stock?.lotSize,
            });
            const label = `${o.priceType === "LIMIT" ? "Limit" : "Market"} ${buy ? "Buy" : "Sell"}`;
            return (
              <article className="m-trade" key={o.id}>
                <time>{stamp(o.executedAt ?? o.createdAt)}</time>
                <span className={`m-badge ${buy ? "buy" : "sell"}`}>
                  {label}
                </span>
                <h2>
                  {baseName({ ...stock, symbol: o.symbol ?? stock?.symbol })}{" "}
                  {expiryLabel(stock)}
                </h2>
                <div className="m-trade-meta">
                  <div>
                    <strong>{num(o.quantity / size)}</strong>
                    <small>LOT</small>
                  </div>
                  <div>
                    <strong>{o.quantity}</strong>
                    <small>QTY</small>
                  </div>
                  <div>
                    <strong>{grouped(o.price ?? o.limitPrice, 4)}</strong>
                    <small>Amount</small>
                  </div>
                </div>
              </article>
            );
          })}
        </MobileEmpty>
        {(query.data?.totalPages > 1 || page > 1) && (
          <Pagination page={page} onChange={setPage} data={query.data} />
        )}
      </div>
    </div>
  );
}
