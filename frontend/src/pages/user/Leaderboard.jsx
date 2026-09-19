import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
} from "@mui/material";
import { Trophy, ArrowUpRight, Lock, Crown } from "lucide-react";
import { prizeForRank, LEADERBOARD_PRIZES } from "../../config/platform";
import { toastInfo } from "../../services/toastService";
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
  formatINR,
  formatPnl,
  formatPercent,
  formatNumber,
  pnlClass,
} from "../../utils/format";
import {
  avatarInitial,
  publicUserLabel,
} from "../../utils/identity";
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
          <h2 className="identity-label">{publicUserLabel(user)}</h2>
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
  const navigate = useNavigate();
  const premium = current?.isPremium === true;
  // Everyone can see the rankings; only members can open a trader, others are sent to payment.
  const open = (r) => {
    if (!premium) {
      toastInfo("Become a member to view trader profiles.", { id: "leaderboard-member" });
      navigate("/membership");
      return;
    }
    if (publicId(r)) setSelected(publicId(r));
  };
  const rows = query.data?.rows ?? [];
  const prizeOf = (r, i) => prizeForRank(r.rank ?? i + 1);
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
          {publicUserLabel(r)}
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
      key: "prize",
      label: "Prize",
      render: (r) =>
        prizeForRank(r.rank) ? (
          <strong className="prize-amount">{formatINR(prizeForRank(r.rank), 0)}</strong>
        ) : (
          "—"
        ),
    },
    {
      key: "profile",
      label: "Profile",
      render: (r) =>
        publicId(r) || !premium ? (
          <Button size="small" onClick={(e) => {
                    e.stopPropagation();
                    open(r);
                  }}>
            {premium ? "View" : <Lock size={13} />} <ArrowUpRight size={14} />
          </Button>
        ) : (
          "—"
        ),
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="THE TRADEBULLKING LEADERBOARD"
        title="Leaderboard"
        description="A closer look at the traders setting the pace."
      />
      <section className="surface prize-banner">
        <div className="section-heading">
          <h2>
            <Crown size={18} /> Weekly winners
          </h2>
          <span>Top 5 traders win</span>
        </div>
        <ol className="prize-list">
          {LEADERBOARD_PRIZES.map((amount, i) => (
            <li key={amount}>
              <span>#{i + 1}</span>
              <strong>{formatINR(amount, 0)}</strong>
            </li>
          ))}
        </ol>
        {!premium && (
          <p className="prize-cta">
            Leaderboard details are for members.{" "}
            <Button size="small" variant="contained" onClick={() => navigate("/membership")}>
              Make me a member
            </Button>
          </p>
        )}
      </section>
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
              role="button"
              tabIndex={0}
              onClick={() => open(r)}
              onKeyDown={(e) => e.key === "Enter" && open(r)}
            >
              <Trophy size={24} />
              <span>RANK {r.rank ?? "—"}</span>
              <Avatar src={r.profilePic || undefined}>
                {avatarInitial(r)}
              </Avatar>
              <h2 className="identity-label">{publicUserLabel(r)}</h2>
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
              {prizeOf(r, i) && (
                <span className="prize-chip">Prize {formatINR(prizeOf(r, i), 0)}</span>
              )}
              {(publicId(r) || !premium) && (
                <Button onClick={(e) => {
                    e.stopPropagation();
                    open(r);
                  }}>
                  {premium ? "View profile" : "Become a member"}
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
                role="button"
                tabIndex={0}
                onClick={() => open(r)}
                onKeyDown={(e) => e.key === "Enter" && open(r)}
              >
                <span>#{r.rank ?? "—"}</span>
                <Avatar
                  src={r.profilePic || undefined}
                  sx={{ width: 36, height: 36 }}
                >
                  {avatarInitial(r)}
                </Avatar>
                <div>
                  <strong className="identity-label">
                    {publicUserLabel(r)}
                    {(r.userId ?? r.id) === current?.id && " · You"}
                  </strong>
                  <small>
                    {formatNumber(r.totalTrades)} trades ·{" "}
                    {formatPercent(r.winRate)} win rate
                    {r.type === "dummy" && " · Demo"}
                    {prizeOf(r, i) && ` · Prize ${formatINR(prizeOf(r, i), 0)}`}
                  </small>
                  {(publicId(r) || !premium) && (
                    <Button
                      size="small"
                      onClick={(e) => {
                    e.stopPropagation();
                    open(r);
                  }}
                    >
                      {premium ? "View profile" : "Become a member"}
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
              onRow={open}
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
