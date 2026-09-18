import { useState } from "react";
import {
  Button,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Search } from "lucide-react";
import { useQuery, useDebounce } from "../../hooks/useQuery";
import { stockService } from "../../services/stockService";
import { watchlistService } from "../../services/watchlistService";
import { errorMessage } from "../../services/api";
import { store, invalidate } from "../../store/store";
import { PageHeader, Pagination } from "../../components/DataView";
import { QueryState, Notice } from "../../components/Feedback";
import StockList from "../../components/StockList";
export default function Market() {
  const [search, setSearch] = useState("");
  const q = useDebounce(search);
  const [exchange, setExchange] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const [angel, setAngel] = useState(false);
  const [angelResults, setAngelResults] = useState(null);
  const query = useQuery(
    (signal) =>
      q
        ? stockService.search({ q, exchange: exchange || undefined }, signal)
        : stockService.list(
            { page, limit: 20, exchange: exchange || undefined },
            signal,
          ),
    [q, exchange, page],
  );
  async function add(id) {
    if (busy) return;
    setBusy(id);
    try {
      await watchlistService.add(id);
      store.dispatch(invalidate());
      setNotice({ message: "Instrument added to your watchlist." });
    } catch (e) {
      setNotice({ message: errorMessage(e), severity: "error" });
    } finally {
      setBusy(null);
    }
  }
  async function searchAngel() {
    if (busy || !q.trim()) return;
    setBusy("angel");
    try {
      const result = await stockService.angelSearch({
        exchange: exchange || "NSE",
        searchscrip: q.trim(),
      });
      setAngelResults(result);
    } catch (e) {
      setNotice({ message: errorMessage(e), severity: "error" });
    } finally {
      setBusy(null);
    }
  }
  const instrumentResults = Array.isArray(angelResults)
    ? angelResults
    : (angelResults?.instruments ?? angelResults?.data);
  return (
    <>
      <PageHeader
        title="Market"
        description="Find your next instrument. Build your focus."
        action={
          <Button variant="outlined" onClick={() => setAngel(true)}>
            AngelOne search
          </Button>
        }
      />
      <section className="surface">
        <div className="toolbar">
          <div className="search-field">
            <Search size={17} />
            <TextField
              placeholder="Search symbol or company"
              slotProps={{ htmlInput: { "aria-label": "Search instruments" } }}
              size="small"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <TextField
            select
            label="Exchange"
            size="small"
            value={exchange}
            onChange={(e) => {
              setExchange(e.target.value);
              setPage(1);
            }}
            className="filter-field"
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
          empty={!query.data?.rows?.length}
          emptyTitle={
            q ? "No matching instruments" : "No instruments available"
          }
          emptyText={
            q
              ? "Try a different symbol or company name."
              : "Instruments will appear once the administrator adds them."
          }
        >
          <StockList rows={query.data?.rows || []} onAdd={add} busy={busy} />
        </QueryState>
        {!q && <Pagination page={page} onChange={setPage} data={query.data} />}
      </section>
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <Dialog
        open={angel}
        onClose={() => setAngel(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Search AngelOne instruments</DialogTitle>
        <DialogContent>
          <p>
            Search the provider catalogue. Results must be enabled by an
            administrator before they can be traded.
          </p>
          <TextField
            label="Instrument search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {Array.isArray(instrumentResults) && (
            <ul className="provider-results">
              {instrumentResults.map((r, i) => (
                <li key={r.symboltoken ?? i}>
                  <strong>
                    {r.tradingsymbol ?? r.symbol ?? r.name ?? "Instrument"}
                  </strong>
                  <span>
                    {r.exchange ?? exchange} · {r.symboltoken ?? r.token ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {Array.isArray(instrumentResults) && !instrumentResults.length && (
            <p>No provider instruments found.</p>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAngel(false)}>Close</Button>
          <Button
            variant="contained"
            disabled={Boolean(busy) || !q.trim()}
            onClick={searchAngel}
          >
            {busy === "angel" ? "Searching…" : "Search catalogue"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
