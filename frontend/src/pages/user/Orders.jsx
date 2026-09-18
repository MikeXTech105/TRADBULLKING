import { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  TextField,
} from "@mui/material";
import { useQuery } from "../../hooks/useQuery";
import { orderService } from "../../services/orderService";
import {
  PageHeader,
  DataTable,
  orderColumns,
  Pagination,
} from "../../components/DataView";
import { QueryState } from "../../components/Feedback";
import { formatINR, formatDate } from "../../utils/format";
function OrderDetails({ id, onClose }) {
  const query = useQuery(() => orderService.get(id), [id]);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Order details</DialogTitle>
      <DialogContent>
        <QueryState query={query}>
          <dl className="detail-list">
            {[
              ["symbol", "Instrument"],
              ["exchange", "Exchange"],
              ["orderType", "Side"],
              ["quantity", "Quantity"],
              ["priceType", "Price type"],
              ["status", "Status"],
            ].map(([k, l]) => (
              <div key={k}>
                <dt>{l}</dt>
                <dd>{query.data?.[k] ?? "—"}</dd>
              </div>
            ))}
            <div>
              <dt>Execution price</dt>
              <dd>{formatINR(query.data?.price)}</dd>
            </div>
            {query.data?.priceType === "LIMIT" && (
              <div>
                <dt>Limit price</dt>
                <dd>{formatINR(query.data?.limitPrice)}</dd>
              </div>
            )}
            <div>
              <dt>Trade fee</dt>
              <dd>{formatINR(query.data?.feesDeducted)}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>
                {formatDate(query.data?.executedAt ?? query.data?.createdAt)}
              </dd>
            </div>
          </dl>
        </QueryState>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
export default function Orders() {
  const [side, setSide] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const query = useQuery(
    (signal) =>
      orderService.list(
        {
          page,
          limit: 20,
          orderType: side || undefined,
          status: status || undefined,
        },
        signal,
      ),
    [page, side, status],
  );
  return (
    <>
      <PageHeader title="Orders" description="Every decision, in one place." />
      <section className="surface">
        <div className="toolbar">
          <div className="tab-buttons">
            {[
              ["", "All"],
              ["BUY", "Buy"],
              ["SELL", "Sell"],
            ].map(([value, label]) => (
              <button
                className={side === value ? "active" : ""}
                key={label}
                onClick={() => {
                  setSide(value);
                  setPage(1);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <TextField
            className="filter-field"
            size="small"
            select
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {["PENDING", "EXECUTED", "CANCELLED", "FAILED"].map((x) => (
              <MenuItem key={x} value={x}>
                {x}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <QueryState
          query={query}
          empty={!query.data?.rows?.length}
          emptyTitle="No orders found"
          emptyText="Your matching paper orders will appear here."
        >
          <DataTable
            rows={query.data?.rows}
            columns={[
              ...orderColumns,
              {
                key: "details",
                label: "Details",
                render: (r) => (
                  <Button size="small" onClick={() => setSelected(r.id)}>
                    View
                  </Button>
                ),
              },
            ]}
          />
        </QueryState>
        <Pagination page={page} onChange={setPage} data={query.data} />
      </section>
      {selected && (
        <OrderDetails id={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
