import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, TextField } from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import { useQuery } from "../../hooks/useQuery";
import { watchlistService } from "../../services/watchlistService";
import { errorMessage } from "../../services/api";
import { store, invalidate } from "../../store/store";
import { PageHeader, ConfirmDialog } from "../../components/DataView";
import { QueryState, Notice } from "../../components/Feedback";
import StockList from "../../components/StockList";
export default function Watchlist() {
  const query = useQuery((signal) => watchlistService.list(signal));
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(null);
  const [clear, setClear] = useState(false);
  const [notice, setNotice] = useState(null);
  const rows = (query.data?.rows ?? []).filter((r) =>
    `${r.symbol} ${r.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  async function remove(id) {
    if (busy) return;
    setBusy(id);
    try {
      await watchlistService.remove(id);
      store.dispatch(invalidate());
      setNotice({ message: "Instrument removed." });
    } catch (e) {
      setNotice({ severity: "error", message: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  }
  async function clearAll() {
    if (busy) return;
    setBusy("all");
    try {
      await watchlistService.clear();
      store.dispatch(invalidate());
      setClear(false);
      setNotice({ message: "Watchlist cleared." });
    } catch (e) {
      setNotice({ severity: "error", message: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <PageHeader
        title="Watchlist"
        description="A focused view of the instruments that matter to you."
        action={
          <Button
            component={Link}
            to="/market"
            variant="contained"
            startIcon={<Plus size={16} />}
          >
            Add instrument
          </Button>
        }
      />
      <section className="surface">
        <div className="toolbar">
          <TextField
            size="small"
            label="Filter your watchlist"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            disabled={!query.data?.rows?.length}
            startIcon={<Trash2 size={15} />}
            onClick={() => setClear(true)}
          >
            Clear
          </Button>
        </div>
        <QueryState
          query={query}
          empty={!rows.length}
          emptyTitle={search ? "No matches" : "Your watchlist starts here"}
          emptyText="Discover instruments and add them to your watchlist."
          action={
            <Button component={Link} to="/market">
              Explore market
            </Button>
          }
        >
          <StockList rows={rows} onRemove={remove} busy={busy} />
        </QueryState>
      </section>
      <ConfirmDialog
        open={clear}
        title="Clear your watchlist?"
        description="All instruments will be removed from your watchlist."
        onClose={() => setClear(false)}
        onConfirm={clearAll}
        busy={busy === "all"}
      />
      <Notice notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
