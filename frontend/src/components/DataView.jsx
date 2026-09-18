import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import {
  BarChart3,
  Wallet,
  Activity,
  Users,
  IndianRupee,
  List,
  Layers,
  ClipboardList,
  Trophy,
  UserRound,
  Crown,
  Settings,
  CandlestickChart,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import {
  formatDate,
  formatINR,
  formatNumber,
  formatPercent,
  formatPnl,
  pnlClass,
  hasNumber,
} from "../utils/format";
export function PageHeader({
  eyebrow = "Workspace",
  title,
  description,
  action,
}) {
  const { pathname } = useLocation();
  const Icon = /users/.test(pathname)
    ? Users
    : /watchlist/.test(pathname)
      ? List
      : /positions/.test(pathname)
        ? Layers
        : /orders|payments/.test(pathname)
          ? ClipboardList
          : /leaderboard/.test(pathname)
            ? Trophy
            : /profile/.test(pathname)
              ? UserRound
              : /settings/.test(pathname)
                ? Settings
                : /membership/.test(pathname)
                  ? Crown
                  : /wallet|portfolio/.test(pathname)
                    ? Wallet
                    : /market|stocks/.test(pathname)
                      ? CandlestickChart
                      : BarChart3;
  return (
    <div className="page-heading">
      <div>
        <span className="page-icon">
          <Icon size={21} />
        </span>
        <div>
          <span className="form-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
export function StatCards({ data, fields, primaryCount = 4 }) {
  return (
    <div className="stats-grid">
      {fields
        .filter(([key]) => hasNumber(data?.[key]))
        .map(([key, label, type], index) => {
          const Icon = /user|member|account/i.test(key)
            ? Users
            : type === "pnl"
              ? Activity
              : /balance|value/i.test(key)
                ? Wallet
                : IndianRupee;
          return (
            <article
              className={`stat-card accent-${index % 4} ${index >= primaryCount ? "secondary-stat" : ""}`}
              key={key}
            >
              <div className="stat-content">
                <span>{label}</span>
                <strong className={type === "pnl" ? pnlClass(data[key]) : ""}>
                  {type === "number"
                    ? formatNumber(data[key])
                    : type === "percent"
                      ? formatPercent(data[key])
                      : type === "pnl"
                        ? formatPnl(data[key])
                        : formatINR(data[key], 0)}
                </strong>
              </div>
              <span className="stat-icon">
                <Icon size={17} />
              </span>
            </article>
          );
        })}
    </div>
  );
}
export function StatusBadge({ value }) {
  const status = String(value ?? "—");
  const tone = /^(active|premium|success|executed|completed|connected)$/i.test(
    status,
  )
    ? "success"
    : /^(inactive|expired|failed|rejected|disconnected)$/i.test(status)
      ? "danger"
      : /trial|pending/i.test(status)
        ? "warning"
        : "info";
  return <span className={`status-chip tone-${tone}`}>{status}</span>;
}
export function DataTable({
  rows,
  columns,
  onRow,
  rowClassName,
  empty = "No records yet.",
}) {
  if (!rows?.length) return <div className="inline-empty">{empty}</div>;
  return (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id || row.stockId || index}
              onClick={onRow ? () => onRow(row) : undefined}
              className={`${onRow ? "clickable" : ""} ${rowClassName?.(row) ?? ""}`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`cell-${c.key}`}
                  data-label={c.label}
                >
                  {c.render ? c.render(row) : (row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Pagination({ page, onChange, data, limit = 20 }) {
  const pages =
    data?.totalPages ??
    (Number.isFinite(data?.total) ? Math.ceil(data.total / limit) : null);
  return (
    <div className="pagination">
      <span>
        {data?.total !== undefined
          ? `${formatNumber(data.total)} records · `
          : ""}
        Page {page}
        {pages ? ` of ${pages}` : ""}
      </span>
      <div>
        <Button disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button
          disabled={
            pages !== null ? page >= pages : !(data?.rows?.length >= limit)
          }
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
export function ConfirmDialog({
  open,
  title,
  description,
  onClose,
  onConfirm,
  busy,
}) {
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <p>{description}</p>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" disabled={busy} onClick={onConfirm}>
          {busy ? "Saving…" : "Confirm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
export const orderColumns = [
  {
    key: "symbol",
    label: "Instrument",
    render: (r) => (
      <div className="instrument-cell">
        <strong>{r.symbol ?? r.stock?.symbol ?? "—"}</strong>
        <small>{r.exchange ?? r.stock?.exchange ?? ""}</small>
      </div>
    ),
  },
  {
    key: "orderType",
    label: "Side",
    render: (r) => (
      <span className={`side-tag ${(r.orderType || "").toLowerCase()}`}>
        {r.orderType ?? "—"}
      </span>
    ),
  },
  { key: "quantity", label: "Quantity" },
  { key: "priceType", label: "Type" },
  {
    key: "price",
    label: "Price",
    render: (r) => formatINR(r.price ?? r.limitPrice),
  },
  {
    key: "status",
    label: "Status",
    render: (r) => <StatusBadge value={r.status} />,
  },
  {
    key: "executedAt",
    label: "Date",
    render: (r) => formatDate(r.executedAt ?? r.createdAt),
  },
];
export const portfolioFields = [
  ["totalPortfolioValue", "Portfolio value"],
  ["totalUnrealizedPnl", "Unrealized P&L", "pnl"],
  ["dummyBalance", "Dummy balance"],
  ["feeBalance", "Fee balance"],
  ["totalInvested", "Invested value"],
  ["totalCurrentValue", "Current value"],
  ["totalRealizedPnl", "Realized P&L", "pnl"],
  ["openPositionsCount", "Open positions", "number"],
];
