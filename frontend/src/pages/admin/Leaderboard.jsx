import RowActions from "../../components/RowActions";
import { useRef, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { Plus } from "lucide-react";
import { useQuery } from "../../hooks/useQuery";
import { adminService } from "../../services/adminService";
import { errorMessage } from "../../services/api";
import { store, invalidate } from "../../store/store";
import {
  PageHeader,
  DataTable,
  ConfirmDialog,
} from "../../components/DataView";
import { QueryState, Notice } from "../../components/Feedback";
import { formatPnl, formatPercent, pnlClass } from "../../utils/format";
function EntryForm({ entry, onClose }) {
  const edit = Boolean(entry?.id);
  const lock = useRef(false);
  const fields = edit
    ? ["name", "totalPnl"]
    : [
        "name",
        "profilePic",
        "totalPnl",
        "totalTrades",
        "winRate",
        "winAmount",
        "lossAmount",
      ];
  const [values, setValues] = useState({
    name: entry?.name ?? "",
    profilePic: entry?.profilePic ?? "",
    totalPnl: entry?.totalPnl ?? "",
    totalTrades: entry?.totalTrades ?? "",
    winRate: entry?.winRate ?? "",
    winAmount: entry?.winAmount ?? "",
    lossAmount: entry?.lossAmount ?? "",
    isVisible: entry?.isVisible ?? true,
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (lock.current) return;
    const next = {};
    if (!values.name.trim()) next.name = "Enter a name.";
    if (values.totalPnl === "" || !Number.isFinite(Number(values.totalPnl)))
      next.totalPnl = "Enter a valid P&L amount.";
    if (values.profilePic) {
      try {
        const url = new URL(values.profilePic);
        if (!["https:", "http:"].includes(url.protocol))
          next.profilePic = "Use an HTTP or HTTPS image URL.";
      } catch {
        next.profilePic = "Enter a valid image URL.";
      }
    }
    for (const k of ["totalTrades", "winRate", "winAmount", "lossAmount"])
      if (
        values[k] !== "" &&
        (!Number.isFinite(Number(values[k])) ||
          Number(values[k]) < 0 ||
          (k === "winRate" && Number(values[k]) > 100) ||
          (k === "totalTrades" && !Number.isInteger(Number(values[k]))))
      )
        next[k] = "Enter a valid non-negative value.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const body = Object.fromEntries(
      fields
        .filter((k) => values[k] !== "")
        .map((k) => [
          k,
          ["name", "profilePic"].includes(k)
            ? values[k].trim()
            : Number(values[k]),
        ]),
    );
    if (edit) body.isVisible = values.isVisible;
    lock.current = true;
    setBusy(true);
    try {
      await (edit
        ? adminService.editEntry(entry.id, body)
        : adminService.addEntry(body));
      store.dispatch(invalidate());
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit} noValidate>
        <DialogTitle>{edit ? "Edit" : "Add"} synthetic entry</DialogTitle>
        <DialogContent>
          <p className="subtle-label">
            Demo / Synthetic Entry — this record does not represent a real user.
          </p>
          <div className="fields dialog-fields">
            {fields.map((key) => (
              <TextField
                key={key}
                label={
                  {
                    name: "Display name",
                    profilePic: "Profile image URL (optional)",
                    totalPnl: "Total P&L",
                    totalTrades: "Total trades",
                    winRate: "Win rate (%)",
                    winAmount: "Win amount",
                    lossAmount: "Loss amount",
                  }[key]
                }
                type={["name", "profilePic"].includes(key) ? "text" : "number"}
                value={values[key]}
                onChange={(e) =>
                  setValues({ ...values, [key]: e.target.value })
                }
                error={Boolean(errors[key])}
                helperText={errors[key]}
              />
            ))}
            {edit && (
              <FormControlLabel
                label="Visible in leaderboard"
                control={
                  <Checkbox
                    checked={values.isVisible}
                    onChange={(e) =>
                      setValues({ ...values, isVisible: e.target.checked })
                    }
                  />
                }
              />
            )}
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
          <Button disabled={busy} variant="contained" type="submit">
            {busy ? "Saving…" : "Save entry"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
export default function Leaderboard() {
  const query = useQuery((signal) => adminService.leaderboard(signal));
  const [form, setForm] = useState(null);
  const [remove, setRemove] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  async function confirm() {
    if (busy) return;
    setBusy(true);
    try {
      await adminService.deleteEntry(remove.id);
      store.dispatch(invalidate());
      setRemove(null);
      setNotice({ message: "Synthetic entry deleted." });
    } catch (err) {
      setNotice({ severity: "error", message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }
  const columns = [
    {
      key: "name",
      label: "Entry",
      render: (r) => (
        <span className="instrument-cell">
          <strong>{r.name}</strong>
          <small>Demo / Synthetic Entry</small>
        </span>
      ),
    },
    {
      key: "totalPnl",
      label: "Total P&L",
      render: (r) => (
        <strong className={pnlClass(r.totalPnl)}>
          {formatPnl(r.totalPnl)}
        </strong>
      ),
    },
    { key: "totalTrades", label: "Trades" },
    {
      key: "winRate",
      label: "Win rate",
      render: (r) => formatPercent(r.winRate),
    },
    {
      key: "isVisible",
      label: "Visibility",
      render: (r) =>
        r.isVisible === true
          ? "Visible"
          : r.isVisible === false
            ? "Hidden"
            : "—",
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <RowActions
          name={r.name}
          actions={[
            { label: "Edit", onClick: () => setForm(r) },
            { label: "Delete", danger: true, onClick: () => setRemove(r) },
          ]}
        />
      ),
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="LEADERBOARD OPERATIONS"
        title="Synthetic leaderboard entries"
        description="Manage demo records separately from real trading accounts."
        action={
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setForm({})}
          >
            Add entry
          </Button>
        }
      />
      <section className="surface">
        <QueryState
          query={query}
          empty={!query.data?.rows?.length}
          emptyTitle="No synthetic entries"
          emptyText="Add demo entries when you need a populated leaderboard."
        >
          <DataTable rows={query.data?.rows} columns={columns} />
        </QueryState>
      </section>
      {form && <EntryForm entry={form} onClose={() => setForm(null)} />}
      <ConfirmDialog
        open={Boolean(remove)}
        title="Delete synthetic entry?"
        description={`Remove ${remove?.name ?? "this entry"} from the leaderboard?`}
        onClose={() => setRemove(null)}
        onConfirm={confirm}
        busy={busy}
      />
      <Notice notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
