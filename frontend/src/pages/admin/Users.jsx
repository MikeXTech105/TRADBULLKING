import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, MenuItem, TextField } from "@mui/material";
import { ArrowLeft } from "lucide-react";
import { useQuery, useDebounce } from "../../hooks/useQuery";
import { adminService } from "../../services/adminService";
import { errorMessage } from "../../services/api";
import { store, invalidate } from "../../store/store";
import {
  PageHeader,
  DataTable,
  StatCards,
  Pagination,
  ConfirmDialog,
  StatusBadge,
  orderColumns,
} from "../../components/DataView";
import { QueryState, Notice } from "../../components/Feedback";
import { formatINR, formatDate } from "../../utils/format";
import ServerMetrics from "../../components/ServerMetrics";
export default function Users() {
  const [search, setSearch] = useState("");
  const q = useDebounce(search);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const query = useQuery(
    (signal) =>
      adminService.users(
        {
          page,
          limit: 20,
          search: q || undefined,
          filter: filter || undefined,
        },
        signal,
      ),
    [page, q, filter],
  );
  const columns = [
    {
      key: "name",
      label: "User",
      render: (r) => (
        <span className="instrument-cell">
          <strong>{r.name}</strong>
          <small>{r.email}</small>
        </span>
      ),
    },
    { key: "phone", label: "Phone" },
    {
      key: "isActive",
      label: "Status",
      render: (r) => (
        <StatusBadge
          value={
            r.isActive === true
              ? "Active"
              : r.isActive === false
                ? "Inactive"
                : undefined
          }
        />
      ),
    },
    {
      key: "isPremium",
      label: "Membership",
      render: (r) => (
        <StatusBadge
          value={
            r.isPremium === true
              ? "Premium"
              : r.trialStatus === "active"
                ? "Trial"
                : r.trialStatus === "expired"
                  ? "Expired"
                  : r.isPremium === false
                    ? "Standard"
                    : undefined
          }
        />
      ),
    },
    {
      key: "dummyBalance",
      label: "Balance",
      render: (r) => formatINR(r.dummyBalance, 0),
    },
    { key: "totalTrades", label: "Trades" },
    {
      key: "action",
      label: "Details",
      render: (r) => (
        <Button component={Link} to={`/admin/users/${r.id}`} size="small">
          View user
        </Button>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="USER OPERATIONS"
        title="Users"
        description="Membership, access, and trading activity."
      />
      <section className="surface">
        <div className="toolbar">
          <TextField
            size="small"
            label="Search name, email, or phone"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <TextField
            className="filter-field"
            size="small"
            select
            label="Membership"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">All users</MenuItem>
            {["premium", "trial", "expired"].map((x) => (
              <MenuItem key={x} value={x}>
                {x}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <QueryState
          query={query}
          empty={!query.data?.rows?.length}
          emptyTitle="No users found"
          emptyText="Try changing your search or membership filter."
        >
          <DataTable rows={query.data?.rows} columns={columns} />
        </QueryState>
        <Pagination page={page} onChange={setPage} data={query.data} />
      </section>
    </>
  );
}
export function UserDetail() {
  const { id } = useParams();
  const query = useQuery(() => adminService.user(id), [id]);
  const [page, setPage] = useState(1);
  const trades = useQuery(
    (signal) => adminService.trades(id, { page, limit: 20 }, signal),
    [id, page],
  );
  const pnl = useQuery(() => adminService.pnl(id), [id]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const user = query.data?.user ?? query.data;
  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      await adminService.toggleUser(id);
      store.dispatch(invalidate());
      setConfirm(false);
      setNotice({ message: "User access updated." });
    } catch (err) {
      setNotice({ severity: "error", message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" to="/admin/users">
        <ArrowLeft size={15} />
        Users
      </Link>
      <PageHeader
        eyebrow="USER DETAIL"
        title={user?.name ?? "User details"}
        description="Account information and server-calculated performance."
        action={
          <Button
            disabled={!user || query.loading}
            variant="outlined"
            onClick={() => setConfirm(true)}
          >
            {user?.isActive ? "Deactivate user" : "Activate user"}
          </Button>
        }
      />
      <QueryState query={query}>
        <StatCards
          data={user}
          fields={[
            ["dummyBalance", "Dummy balance"],
            ["feeBalance", "Fee balance"],
            ["totalPnl", "Total P&L", "pnl"],
            ["totalTrades", "Trades", "number"],
          ]}
        />
        <section className="surface">
          <dl className="detail-list">
            {[
              ["name", "Name"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["role", "Role"],
            ].map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{user?.[key] ?? "—"}</dd>
              </div>
            ))}
            <div>
              <dt>Premium</dt>
              <dd>
                {user?.isPremium === undefined
                  ? "—"
                  : user.isPremium
                    ? "Yes"
                    : "No"}
              </dd>
            </div>
            <div>
              <dt>Account status</dt>
              <dd>
                {user?.isActive === undefined
                  ? "—"
                  : user.isActive
                    ? "Active"
                    : "Inactive"}
              </dd>
            </div>
            <div>
              <dt>Trial ends</dt>
              <dd>{formatDate(user?.trialEndDate)}</dd>
            </div>
          </dl>
        </section>
      </QueryState>
      <section className="surface">
        <div className="section-heading">
          <h2>Profit & loss</h2>
        </div>
        <QueryState query={pnl}>
          <ServerMetrics data={pnl.data} />
        </QueryState>
      </section>
      <section className="surface">
        <div className="section-heading">
          <h2>Trading history</h2>
        </div>
        <QueryState
          query={trades}
          empty={!trades.data?.rows?.length}
          emptyTitle="No trades yet"
          emptyText="Executed trades for this user will appear here."
        >
          <DataTable rows={trades.data?.rows} columns={orderColumns} />
        </QueryState>
        <Pagination page={page} onChange={setPage} data={trades.data} />
      </section>
      <ConfirmDialog
        open={confirm}
        title={`${user?.isActive ? "Deactivate" : "Activate"} this user?`}
        description="This updates the user's ability to access the platform. Confirm the account before continuing."
        onClose={() => setConfirm(false)}
        onConfirm={toggle}
        busy={busy}
      />
      <Notice notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
