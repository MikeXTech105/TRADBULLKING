import RowActions from "../../components/RowActions";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Switch,
  TextField,
} from "@mui/material";
import { Plus, RefreshCw, Search } from "lucide-react";
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
  StatusBadge,
} from "../../components/DataView";
import { QueryState } from "../../components/Feedback";
import {
  toastError,
  toastLoading,
  toastSuccess,
} from "../../services/toastService";
import { formatINR } from "../../utils/format";
function InstrumentPicker({ onPick, onClose }) {
  const [search, setSearch] = useState("");
  const q = useDebounce(search);
  const [exchange, setExchange] = useState("NSE");
  const [instrumenttype, setInstrumentType] = useState("stock");
  const [page, setPage] = useState(1);
  const query = useQuery(
    (signal) =>
      adminService.instruments(
        {
          search: q || undefined,
          exchange: exchange || undefined,
          instrumenttype: instrumenttype || undefined,
          page,
          limit: 20,
        },
        signal,
      ),
    [q, exchange, instrumenttype, page],
  );
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Browse AngelOne instruments</DialogTitle>
      <DialogContent>
        <p className="subtle-label">
          Pick a verified provider instrument to auto-fill the symbol,
          token, exchange, and name below.
        </p>
        <div className="fields dialog-fields">
          <TextField
            label="Search instrument"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            slotProps={{
              input: { startAdornment: <Search size={16} /> },
            }}
          />
          <TextField
            select
            label="Exchange"
            value={exchange}
            onChange={(e) => {
              setExchange(e.target.value);
              setPage(1);
            }}
          >
            {PROVIDER_EXCHANGES.map((x) => (
              <MenuItem key={x} value={x}>
                {x}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Instrument type"
            value={instrumenttype}
            onChange={(e) => {
              setInstrumentType(e.target.value);
              setPage(1);
            }}
          >
            {PROVIDER_INSTRUMENT_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <QueryState
          query={query}
          empty={!query.data?.rows?.length}
          emptyTitle="No provider instruments found"
          emptyText="Try a different search term, exchange, or instrument type."
        >
          <ul className="provider-results">
            {(query.data?.rows ?? []).map((r, i) => (
              <li key={r.token || i}>
                <button
                  type="button"
                  className="provider-result-row"
                  onClick={() =>
                    onPick({
                      symbol: r.symbol,
                      token: r.token,
                      exchange: r.exchange ?? exchange,
                      name: r.name ?? r.symbol,
                    })
                  }
                >
                  <strong>{r.symbol ?? "Instrument"}</strong>
                  <span>
                    {r.exchange ?? exchange} · {r.token || "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </QueryState>
        <Pagination page={page} onChange={setPage} data={query.data} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
export function StockForm({ stock, onClose }) {
  const edit = Boolean(stock?.id);
  const lock = useRef(false);
  const [values, setValues] = useState(
    edit
      ? {
          name: stock.name ?? "",
          high52: stock.high52 ?? "",
          low52: stock.low52 ?? "",
        }
      : {
          // Prefilled when opened from the Instruments & Symbols catalogue
          // ("Add to Trading"); empty when opened as a blank Add stock form.
          symbol: stock?.symbol ?? "",
          token: stock?.token ?? "",
          exchange: stock?.exchange ?? "NSE",
          name: stock?.name ?? "",
          exchangeType: 1,
        },
  );
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const fields = edit
    ? ["name", "high52", "low52"]
    : ["symbol", "token", "exchange", "name", "exchangeType"];
  async function submit(e) {
    e.preventDefault();
    if (lock.current) return;
    const next = {};
    for (const key of edit ? ["name"] : ["symbol", "token", "exchange", "name"])
      if (!String(values[key]).trim()) next[key] = "This field is required.";
    if (
      !edit &&
      (!Number.isInteger(Number(values.exchangeType)) ||
        Number(values.exchangeType) < 1)
    )
      next.exchangeType = "Enter a positive integer.";
    for (const k of ["high52", "low52"])
      if (
        edit &&
        values[k] !== "" &&
        (!Number.isFinite(Number(values[k])) || Number(values[k]) < 0)
      )
        next[k] = "Enter a valid non-negative price.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const body = Object.fromEntries(
      fields
        .filter((k) => values[k] !== "")
        .map((k) => [
          k,
          ["high52", "low52", "exchangeType"].includes(k)
            ? Number(values[k])
            : String(values[k]).trim(),
        ]),
    );
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await (edit
        ? adminService.editStock(stock.id, body)
        : adminService.addStock(body));
      store.dispatch(invalidate());
      toastSuccess(
        edit ? "Instrument updated successfully." : "Instrument added successfully.",
        { id: "stock-form" },
      );
      onClose();
    } catch (err) {
      const message = errorMessage(
        err,
        edit ? "Unable to update instrument." : "Unable to add instrument.",
      );
      setError(message);
      toastError(message, { id: "stock-form" });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit} noValidate>
        <DialogTitle>{edit ? "Edit stock" : "Add stock"}</DialogTitle>
        <DialogContent>
          {!edit && (
            <Button
              type="button"
              variant="outlined"
              startIcon={<Search size={16} />}
              onClick={() => setPicker(true)}
              sx={{ mb: 2 }}
            >
              Browse AngelOne catalogue
            </Button>
          )}
          <div className="fields dialog-fields">
            {fields.map((key) => (
              <TextField
                key={key}
                label={
                  {
                    symbol: "Symbol",
                    token: "AngelOne instrument token",
                    exchange: "Exchange",
                    name: "Instrument name",
                    exchangeType: "Exchange type",
                    // high52: "52-week high",
                    // low52: "52-week low",
                  }[key]
                }
                select={key === "exchange"}
                type={
                  ["exchangeType", "high52", "low52"].includes(key)
                    ? "number"
                    : "text"
                }
                value={values[key]}
                onChange={(e) =>
                  setValues({ ...values, [key]: e.target.value })
                }
                error={Boolean(errors[key])}
                helperText={errors[key]}
              >
                {key === "exchange" &&
                  ["NSE", "BSE", "NFO", "MCX"].map((x) => (
                    <MenuItem key={x} value={x}>
                      {x}
                    </MenuItem>
                  ))}
              </TextField>
            ))}
          </div>
          {error && (
            <Alert severity="error" className="form-alert">
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? "Saving…" : "Save stock"}
          </Button>
        </DialogActions>
      </form>
      {picker && (
        <InstrumentPicker
          onClose={() => setPicker(false)}
          onPick={(picked) => {
            setValues((previous) => ({
              ...previous,
              symbol: picked.symbol ?? previous.symbol,
              token: picked.token ?? previous.token,
              exchange: ["NSE", "BSE", "NFO", "MCX"].includes(picked.exchange)
                ? picked.exchange
                : previous.exchange,
              name: picked.name ?? previous.name,
            }));
            setErrors({});
            setPicker(false);
          }}
        />
      )}
    </Dialog>
  );
}
export default function Stocks() {
  const [search, setSearch] = useState("");
  const q = useDebounce(search);
  const [exchange, setExchange] = useState("");
  const [page, setPage] = useState(1);
  const query = useQuery(
    (signal) =>
      adminService.stocks(
        {
          page,
          limit: 20,
          search: q || undefined,
          exchange: exchange || undefined,
        },
        signal,
      ),
    [q, page, exchange],
  );
  const rows = query.data?.rows ?? [];
  const tokens = useMemo(() => rows.map((r) => r.token), [rows]);
  const livePrices = useTokenPrices(tokens);
  useEffect(() => {
    // Auto-sync once on page load so LTP/52-week values are current without
    // requiring a manual click; failures (e.g. AngelOne session down) stay
    // silent here — the "Sync prices" button remains for an explicit retry.
    adminService
      .sync()
      .then(() => store.dispatch(invalidate()))
      .catch(() => {});
  }, []);
  const [form, setForm] = useState(null);
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [togglingIds, setTogglingIds] = useState(() => new Set());
  async function quickToggle(stock) {
    if (togglingIds.has(stock.id)) return;
    setTogglingIds((prev) => new Set(prev).add(stock.id));
    try {
      await adminService.toggleStock(stock.id);
      store.dispatch(invalidate());
      toastSuccess(
        stock.isActive ? "Instrument disabled." : "Instrument enabled.",
        { id: `stock-toggle-${stock.id}` },
      );
    } catch (err) {
      toastError(errorMessage(err, "Unable to update instrument."), {
        id: `stock-toggle-${stock.id}`,
      });
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(stock.id);
        return next;
      });
    }
  }
  async function confirm() {
    if (busy) return;
    setBusy(true);
    if (action.type === "sync")
      toastLoading("Syncing market prices…", { id: "stock-sync" });
    try {
      if (action.type === "delete")
        await adminService.deleteStock(action.stock.id);
      else if (action.type === "enableAll")
        await Promise.all(
          rows
            .filter((r) => r.isActive === false)
            .map((r) => adminService.toggleStock(r.id)),
        );
      else await adminService.sync();
      store.dispatch(invalidate());
      const message =
        action.type === "delete"
          ? "Instrument deleted successfully."
          : action.type === "enableAll"
            ? "Instruments enabled successfully."
            : "Market prices synced successfully.";
      toastSuccess(message, {
        id: action.type === "sync" ? "stock-sync" : "stock-operation",
      });
      setAction(null);
    } catch (err) {
      toastError(
        errorMessage(
          err,
          action.type === "sync"
            ? "Unable to sync market prices."
            : "Unable to update instrument.",
        ),
        { id: action.type === "sync" ? "stock-sync" : "stock-operation" },
      );
    } finally {
      setBusy(false);
    }
  }
  const columns = [
    {
      key: "symbol",
      label: "Instrument",
      render: (r) => (
        <span className="instrument-cell">
          <strong>{r.symbol}</strong>
          <small>{r.name}</small>
        </span>
      ),
    },
    { key: "exchange", label: "Exchange" },
    { key: "token", label: "Provider token" },
    ...(rows.some((r) => r.high52 !== undefined || r.low52 !== undefined)
      ? [
          // {
          //   key: "high52",
          //   label: "52-week high",
          //   render: (r) => formatINR(r.high52),
          // },
          // {
          //   key: "low52",
          //   label: "52-week low",
          //   render: (r) => formatINR(r.low52),
          // },
        ]
      : []),
    {
      key: "ltp",
      label: "LTP",
      // Live tick from the shared market socket when available; falls back
      // to the last price the backend synced onto the stock record.
      render: (r) => {
        const live = r.token ? livePrices[r.token]?.ltp : undefined;
        return live !== undefined ? formatINR(live) : formatINR(r.ltp);
      },
    },
    {
      key: "isActive",
      label: "Status",
      render: (r) => (
        <div className="status-toggle-cell">
          <Switch
            size="small"
            checked={Boolean(r.isActive)}
            disabled={togglingIds.has(r.id)}
            onChange={() => quickToggle(r)}
            inputProps={{
              "aria-label": `${r.isActive ? "Disable" : "Enable"} ${r.symbol}`,
            }}
          />
          <StatusBadge
            value={
              r.isActive === true
                ? "Active"
                : r.isActive === false
                  ? "Inactive"
                  : undefined
            }
          />
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <RowActions
          name={r.symbol}
          actions={[
            { label: "Edit", onClick: () => setForm(r) },
            {
              label: "Delete",
              danger: true,
              onClick: () => setAction({ type: "delete", stock: r }),
            },
          ]}
        />
      ),
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="MARKET OPERATIONS"
        title="Stock management"
        description="Control the instruments available to your traders."
        action={
          <div className="heading-actions">
            {rows.some((r) => r.isActive === false) && (
              <Button
                variant="outlined"
                onClick={() => setAction({ type: "enableAll" })}
              >
                Enable all
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<RefreshCw size={16} />}
              onClick={() => setAction({ type: "sync" })}
            >
              Sync prices
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => setForm({})}
            >
              Add stock
            </Button>
          </div>
        }
      />
      <section className="surface">
        <div className="toolbar">
          <TextField
            label="Search stocks"
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <TextField
            select
            label="Exchange"
            className="filter-field"
            size="small"
            value={exchange}
            onChange={(e) => {
              setExchange(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">All exchanges</MenuItem>
            {["NSE", "BSE", "NFO", "MCX"].map((x) => (
              <MenuItem key={x} value={x}>
                {x}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <QueryState
          query={query}
          empty={!rows.length}
          emptyTitle="No stocks found"
          emptyText="Add a verified instrument to make it available to users."
        >
          <DataTable rows={rows} columns={columns} />
        </QueryState>
        <Pagination page={page} onChange={setPage} data={query.data} />
      </section>
      {form && <StockForm stock={form} onClose={() => setForm(null)} />}
      <ConfirmDialog
        open={Boolean(action)}
        title={
          action?.type === "delete"
            ? `Delete ${action.stock.symbol}?`
            : action?.type === "enableAll"
              ? "Enable all visible stocks?"
              : "Sync market prices?"
        }
        description={
          action?.type === "delete"
            ? "This removes the instrument. The backend may reject deletion if open positions exist."
            : action?.type === "enableAll"
              ? "This activates every currently disabled stock shown on this page."
              : "Fetch current prices for active instruments from AngelOne."
        }
        onClose={() => setAction(null)}
        onConfirm={confirm}
        busy={busy}
      />
    </>
  );
}
