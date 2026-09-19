import { useMemo, useState } from "react";
import {
  Button,
  Drawer,
  IconButton,
  MenuItem,
  TextField,
  useMediaQuery,
} from "@mui/material";
import { RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { useQuery, useDebounce } from "../../hooks/useQuery";
import { useTokenPrices } from "../../hooks/useTokenPrices";
import {
  adminService,
  PROVIDER_EXCHANGES,
  PROVIDER_INSTRUMENT_TYPES,
} from "../../services/adminService";
import { errorMessage } from "../../services/api";
import { store, invalidate } from "../../store/store";
import {
  PageHeader,
  DataTable,
  Pagination,
  ConfirmDialog,
} from "../../components/DataView";
import { QueryState } from "../../components/Feedback";
import { toastError, toastSuccess } from "../../services/toastService";
import { StockForm } from "./Stocks";
import {
  formatINR,
  formatPercent,
  formatDate,
  pnlClass,
  hasNumber,
} from "../../utils/format";
const LIMITS = [25, 50, 100];
function LtpCell({ token, prices }) {
  const tick = token ? prices[token] : undefined;
  if (!tick) return <span className="muted-cell">Waiting for price</span>;
  return (
    <span className="instrument-ltp">
      {formatINR(tick.ltp)}
      {hasNumber(tick.changePercent) && (
        <small className={pnlClass(tick.changePercent)}>
          {formatPercent(tick.changePercent)}
        </small>
      )}
    </span>
  );
}
function FilterFields({ exchange, setExchange, instrumenttype, setType }) {
  return (
    <>
      <TextField
        select
        label="Exchange"
        className="filter-field"
        size="small"
        value={exchange}
        onChange={(e) => setExchange(e.target.value)}
      >
        <MenuItem value="">All exchanges</MenuItem>
        {PROVIDER_EXCHANGES.map((x) => (
          <MenuItem key={x} value={x}>
            {x}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Instrument type"
        className="filter-field"
        size="small"
        value={instrumenttype}
        onChange={(e) => setType(e.target.value)}
      >
        <MenuItem value="">All types</MenuItem>
        {PROVIDER_INSTRUMENT_TYPES.map((t) => (
          <MenuItem key={t.value} value={t.value}>
            {t.label}
          </MenuItem>
        ))}
      </TextField>
    </>
  );
}
export default function Instruments() {
  const mobile = useMediaQuery("(max-width: 767px)");
  const [search, setSearch] = useState("");
  const q = useDebounce(search, 400);
  // Default to NSE equities (exchange=NSE, type=stock) — the unfiltered
  // catalogue is dominated by other exchanges/index/derivative entries,
  // which isn't the useful starting point for this screen.
  const [exchange, setExchange] = useState("NSE");
  const [instrumenttype, setInstrumentType] = useState("stock");
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [confirmAddAll, setConfirmAddAll] = useState(false);
  const [bulkAdding, setBulkAdding] = useState(false);
  const resetPage = () => setPage(1);
  const query = useQuery(
    (signal) =>
      adminService.instruments(
        {
          search: q || undefined,
          exchange: exchange || undefined,
          instrumenttype: instrumenttype || undefined,
          page,
          limit,
        },
        signal,
      ),
    [q, exchange, instrumenttype, page, limit],
  );
  // A small, curated active list — safe to load in full to determine which
  // catalogue rows are already onboarded as trading stocks.
  const activeStocks = useQuery(
    (signal) => adminService.stocks({ limit: 500 }, signal),
  );
  const activeTokens = useMemo(
    () => new Set((activeStocks.data?.rows ?? []).map((r) => r.token)),
    [activeStocks.data],
  );
  const rows = query.data?.rows ?? [];
  const addableRows = useMemo(
    () => rows.filter((r) => r.token && r.symbol && !activeTokens.has(r.token)),
    [rows, activeTokens],
  );
  async function addAll() {
    if (bulkAdding) return;
    setBulkAdding(true);
    const results = await Promise.allSettled(
      addableRows.map((r) =>
        adminService.addStock({
          symbol: r.symbol,
          token: r.token,
          exchange: PROVIDER_EXCHANGES.includes(r.exchange) ? r.exchange : "NSE",
          name: r.name ?? r.symbol,
          exchangeType: 1,
        }),
      ),
    );
    store.dispatch(invalidate());
    setConfirmAddAll(false);
    setBulkAdding(false);
    const failed = results.filter((r) => r.status === "rejected");
    const noun = (n) => `${n} instrument${n === 1 ? "" : "s"}`;
    if (!failed.length)
      toastSuccess(`Added ${noun(results.length)} to trading.`, {
        id: "instruments-add-all",
      });
    else
      toastError(
        `Added ${noun(results.length - failed.length)} of ${results.length}. ${failed.length} failed: ${errorMessage(failed[0].reason)}`,
        { id: "instruments-add-all" },
      );
  }
  const tokens = useMemo(() => rows.map((r) => r.token), [rows]);
  const prices = useTokenPrices(tokens);
  const hasLot = rows.some((r) => r.lotSize !== undefined);
  const hasExpiry = rows.some((r) => r.expiry !== undefined);
  const hasStrike = rows.some((r) => r.strike !== undefined);
  const columns = [
    {
      key: "symbol",
      label: "Instrument",
      render: (r) => (
        <div className="instrument-cell">
          <strong>{r.symbol || "—"}</strong>
          <small>{r.name || r.exchange}</small>
        </div>
      ),
    },
    { key: "exchange", label: "Exchange" },
    { key: "instrumenttype", label: "Type", render: (r) => r.instrumenttype || "—" },
    { key: "token", label: "Token" },
    {
      key: "ltp",
      label: "LTP",
      render: (r) => <LtpCell token={r.token} prices={prices} />,
    },
    ...(hasLot
      ? [{ key: "lotSize", label: "Lot size", render: (r) => r.lotSize ?? "—" }]
      : []),
    ...(hasExpiry
      ? [{ key: "expiry", label: "Expiry", render: (r) => formatDate(r.expiry) }]
      : []),
    ...(hasStrike
      ? [
          {
            key: "strike",
            label: "Strike",
            render: (r) => (hasNumber(r.strike) ? formatINR(r.strike, 0) : "—"),
          },
        ]
      : []),
    {
      key: "actions",
      label: "Actions",
      render: (r) =>
        activeTokens.has(r.token) ? (
          <span className="status-chip tone-success">Already added</span>
        ) : (
          <Button size="small" onClick={() => setDraft(r)}>
            Add to trading
          </Button>
        ),
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="MARKET OPERATIONS"
        title="Instruments & Symbols"
        description="Browse and manage AngelOne market instruments."
        action={
          <div className="heading-actions">
            {addableRows.length > 0 && (
              <Button
                variant="outlined"
                onClick={() => setConfirmAddAll(true)}
              >
                Add all
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<RefreshCw size={16} />}
              onClick={() => query.retry()}
            >
              Refresh
            </Button>
          </div>
        }
      />
      <section className="surface">
        <div className="toolbar">
          <TextField
            label="Search symbol, name or token…"
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
          />
          {mobile ? (
            <IconButton
              aria-label="Filters"
              onClick={() => setFiltersOpen(true)}
              className={exchange || instrumenttype ? "filter-active" : ""}
            >
              <SlidersHorizontal size={18} />
            </IconButton>
          ) : (
            <>
              <FilterFields
                exchange={exchange}
                setExchange={(v) => {
                  setExchange(v);
                  resetPage();
                }}
                instrumenttype={instrumenttype}
                setType={(v) => {
                  setInstrumentType(v);
                  resetPage();
                }}
              />
              <TextField
                select
                label="Rows"
                className="filter-field"
                size="small"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  resetPage();
                }}
              >
                {LIMITS.map((n) => (
                  <MenuItem key={n} value={n}>
                    {n} rows
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}
        </div>
        <QueryState
          query={query}
          empty={!rows.length}
          emptyTitle="No instruments found"
          emptyText="Try adjusting your search or filters."
          action={<Button onClick={() => query.retry()}>Retry</Button>}
        >
          <DataTable rows={rows} columns={columns} />
        </QueryState>
        <Pagination page={page} onChange={setPage} data={query.data} limit={limit} />
      </section>
      <Drawer
        anchor="bottom"
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        className="order-sheet"
        slotProps={{ paper: { className: "mobile-bottom-sheet" } }}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header">
          <span>Filters</span>
          <IconButton
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          >
            <X size={17} />
          </IconButton>
        </div>
        <div className="sheet-body">
          <div className="fields dialog-fields">
            <FilterFields
              exchange={exchange}
              setExchange={setExchange}
              instrumenttype={instrumenttype}
              setType={setInstrumentType}
            />
          </div>
          <div className="install-actions">
            <Button
              variant="outlined"
              onClick={() => {
                setExchange("");
                setInstrumentType("");
                resetPage();
                setFiltersOpen(false);
              }}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                resetPage();
                setFiltersOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      </Drawer>
      {draft && <StockForm stock={draft} onClose={() => setDraft(null)} />}
      <ConfirmDialog
        open={confirmAddAll}
        title={`Add ${addableRows.length} instrument${addableRows.length === 1 ? "" : "s"} to trading?`}
        description="This adds every instrument currently listed on this page to the active trading stock list."
        onClose={() => setConfirmAddAll(false)}
        onConfirm={addAll}
        busy={bulkAdding}
      />
    </>
  );
}
