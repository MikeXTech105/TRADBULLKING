import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
} from "@mui/material";
import { Trophy, ArrowUpRight } from "lucide-react";
import { useQuery } from "../../hooks/useQuery";
import { leaderboardService } from "../../services/leaderboardService";
import {
  PageHeader,
  StatCards,
  DataTable,
  orderColumns,
} from "../../components/DataView";
import { QueryState } from "../../components/Feedback";
import {
  formatPnl,
  formatPercent,
  formatNumber,
  pnlClass,
} from "../../utils/format";
function PublicProfile({ id, onClose }) {
  const query = useQuery(() => leaderboardService.user(id), [id]);
  const user = query.data?.user ?? query.data;
  const stats = query.data?.stats ?? user;
  const trades = query.data?.recentTrades ?? query.data?.trades ?? [];
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Trader profile</DialogTitle>
      <DialogContent>
        <QueryState query={query}>
          <h2>{user?.name ?? "Trader"}</h2>
          <StatCards
            data={stats}
            fields={[
              ["rank", "Rank", "number"],
              ["totalPnl", "Total P&L", "pnl"],
              ["totalTrades", "Trades", "number"],
              ["winRate", "Win rate", "percent"],
            ]}
          />
          <h3>Recent executed trades</h3>
          <DataTable rows={trades} columns={orderColumns} />
        </QueryState>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
export default function Leaderboard() {
  const current = useSelector((s) => s.auth.user);
  const query = useQuery((signal) => leaderboardService.list(signal));
  const stats = useQuery((signal) => leaderboardService.stats(signal));
  const [selected, setSelected] = useState(null);
  const rows = query.data?.rows ?? [];
  const publicId = (r) => (r.type === "dummy" ? null : (r.userId ?? r.id));
  const columns = [
    {
      key: "rank",
      label: "Rank",
      render: (r) => <span className="rank-number">#{r.rank ?? "—"}</span>,
    },
    {
      key: "name",
      label: "Trader",
      render: (r) => (
        <span className="leader-name">
          {r.name}
          {(r.userId ?? r.id) === current?.id && <small>You</small>}
          {r.type === "dummy" && <small>Demo</small>}
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
    {
      key: "totalTrades",
      label: "Trades",
      render: (r) => formatNumber(r.totalTrades),
    },
    {
      key: "winRate",
      label: "Win rate",
      render: (r) => formatPercent(r.winRate),
    },
    {
      key: "profile",
      label: "Profile",
      render: (r) =>
        publicId(r) ? (
          <Button size="small" onClick={() => setSelected(publicId(r))}>
            View <ArrowUpRight size={14} />
          </Button>
        ) : (
          "—"
        ),
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="THE TRADBULLKING LEADERBOARD"
        title="Leaderboard"
        description="A closer look at the traders setting the pace."
      />
      <QueryState query={stats}>
        <StatCards
          data={stats.data}
          fields={[
            ["totalTraders", "Traders", "number"],
            ["totalPremiumTraders", "Premium traders", "number"],
            ["totalProfitGenerated", "Total profit", "pnl"],
          ]}
        />
      </QueryState>
      <QueryState
        query={query}
        empty={!rows.length}
        emptyTitle="The leaderboard is taking shape"
        emptyText="Rankings will appear as trading performance becomes available."
      >
        <div className="podium">
          {rows.slice(0, 3).map((r, i) => (
            <article
              className={`podium-card place-${i + 1} ${(r.userId ?? r.id) === current?.id ? "current-user" : ""}`}
              key={r.id ?? i}
            >
              <Trophy size={24} />
              <span>RANK {r.rank ?? "—"}</span>
              <Avatar src={r.profilePic || undefined}>
                {r.name?.slice(0, 1)}
              </Avatar>
              <h2>{r.name}</h2>
              {r.type === "dummy" && (
                <span className="status-chip">Demo entry</span>
              )}
              <strong className={pnlClass(r.totalPnl)}>
                {formatPnl(r.totalPnl)}
              </strong>
              <small>
                {formatNumber(r.totalTrades)} trades ·{" "}
                {formatPercent(r.winRate)} win rate
              </small>
              {publicId(r) && (
                <Button onClick={() => setSelected(publicId(r))}>
                  View profile
                </Button>
              )}
            </article>
          ))}
        </div>
        <section className="surface">
          <div className="section-heading">
            <h2>All rankings</h2>
            <span>Performance supplied by backend</span>
          </div>
          <div className="mobile-rankings">
            {rows.map((r, i) => (
              <div
                className={`ranking-row ${(r.userId ?? r.id) === current?.id ? "current-user" : ""}`}
                key={r.id ?? i}
              >
                <span>#{r.rank ?? "—"}</span>
                <Avatar
                  src={r.profilePic || undefined}
                  sx={{ width: 36, height: 36 }}
                >
                  {r.name?.slice(0, 1)}
                </Avatar>
                <div>
                  <strong>
                    {r.name}
                    {(r.userId ?? r.id) === current?.id && " · You"}
                  </strong>
                  <small>
                    {formatNumber(r.totalTrades)} trades ·{" "}
                    {formatPercent(r.winRate)} win rate
                    {r.type === "dummy" && " · Demo"}
                  </small>
                  {publicId(r) && (
                    <Button
                      size="small"
                      onClick={() => setSelected(publicId(r))}
                    >
                      View profile
                    </Button>
                  )}
                </div>
                <strong className={pnlClass(r.totalPnl)}>
                  {formatPnl(r.totalPnl)}
                </strong>
              </div>
            ))}
          </div>
          <div className="desktop-rankings">
            <DataTable
              rows={rows}
              columns={columns}
              rowClassName={(r) =>
                (r.userId ?? r.id) === current?.id ? "current-user" : ""
              }
            />
          </div>
        </section>
      </QueryState>
      {selected && (
        <PublicProfile id={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
