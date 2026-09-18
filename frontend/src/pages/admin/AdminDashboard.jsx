import { Link } from "react-router-dom";
import { Button } from "@mui/material";
import { useQuery } from "../../hooks/useQuery";
import { adminService } from "../../services/adminService";
import { PageHeader, DataTable, orderColumns } from "../../components/DataView";
import { QueryState } from "../../components/Feedback";
import ServerMetrics from "../../components/ServerMetrics";
export default function AdminDashboard() {
  const query = useQuery((signal) => adminService.dashboard(signal));
  const socket =
    query.data?.webSocketStatus ??
    query.data?.websocketStatus ??
    query.data?.webSocket;
  return (
    <>
      <PageHeader
        eyebrow="PLATFORM OPERATIONS"
        title="Analytics overview"
        description="A direct view of platform activity and system health."
        action={
          <div className="heading-actions">
            <Button
              onClick={query.retry}
              disabled={query.loading}
              variant="outlined"
            >
              Refresh
            </Button>
            <Button component={Link} to="/admin/users" variant="contained">
              Manage users
            </Button>
          </div>
        }
      />
      <QueryState query={query}>
        <ServerMetrics data={query.data} />
        {socket !== undefined && (
          <section className="surface">
            <div className="section-heading">
              <h2>Market data connection</h2>
            </div>
            <span className="status-chip">
              {typeof socket === "boolean"
                ? socket
                  ? "Connected"
                  : "Disconnected"
                : typeof socket === "string"
                  ? socket
                  : socket?.connected === true
                    ? "Connected"
                    : socket?.connected === false
                      ? "Disconnected"
                      : "Status unavailable"}
            </span>
          </section>
        )}
        {Array.isArray(query.data?.recentOrders) && (
          <section className="surface">
            <div className="section-heading">
              <h2>Recent orders</h2>
            </div>
            <DataTable rows={query.data.recentOrders} columns={orderColumns} />
          </section>
        )}
      </QueryState>
    </>
  );
}
