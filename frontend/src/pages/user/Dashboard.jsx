import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button } from "@mui/material";
import { ArrowUpRight, Plus } from "lucide-react";
import { useQuery } from "../../hooks/useQuery";
import { orderService } from "../../services/orderService";
import { watchlistService } from "../../services/watchlistService";
import {
  PageHeader,
  StatCards,
  DataTable,
  orderColumns,
  portfolioFields,
} from "../../components/DataView";
import { QueryState } from "../../components/Feedback";
import StockList from "../../components/StockList";
export default function Dashboard() {
  const user = useSelector((s) => s.auth.user);
  const portfolio = useQuery((signal) => orderService.portfolio(signal));
  const watchlist = useQuery((signal) => watchlistService.list(signal));
  const orders = useQuery((signal) =>
    orderService.list({ page: 1, limit: 5 }, signal),
  );
  return (
    <>
      <PageHeader
        title={`Good to see you, ${user?.name?.split(" ")[0] || "trader"}.`}
        description="A clear view of your trading journey."
        action={
          <Button
            component={Link}
            to="/market"
            variant="contained"
            endIcon={<ArrowUpRight size={16} />}
          >
            Explore market
          </Button>
        }
      />
      <QueryState query={portfolio} skeleton="metrics">
        <StatCards data={portfolio.data} fields={portfolioFields} />
      </QueryState>
      <div className="dashboard-grid">
        <section className="surface">
          <div className="section-heading">
            <h2>Your watchlist</h2>
            <Link to="/market">
              <Plus size={17} /> Add
            </Link>
          </div>
          <QueryState
            query={watchlist}
            empty={!watchlist.data?.rows?.length}
            emptyTitle="Build your market focus"
            emptyText="Add instruments to follow their latest prices."
            action={
              <Button component={Link} to="/market">
                Find instruments
              </Button>
            }
          >
            <StockList compact rows={watchlist.data?.rows?.slice(0, 6) || []} />
          </QueryState>
        </section>
        <section className="surface quick-actions">
          <div className="section-heading">
            <h2>Trading shortcuts</h2>
          </div>
          <Link to="/portfolio">
            <span>
              <strong>Portfolio</strong>
              <small>Review your virtual funds and performance</small>
            </span>
            <ArrowUpRight size={17} />
          </Link>
          <Link to="/positions">
            <span>
              <strong>Positions</strong>
              <small>Track open and closed trades</small>
            </span>
            <ArrowUpRight size={17} />
          </Link>
          <Link to="/orders">
            <span>
              <strong>Order history</strong>
              <small>Check execution and pending orders</small>
            </span>
            <ArrowUpRight size={17} />
          </Link>
        </section>
      </div>
      <section className="surface">
        <div className="section-heading">
          <h2>Recent orders</h2>
          <Link to="/orders">
            View all <ArrowUpRight size={15} />
          </Link>
        </div>
        <QueryState
          query={orders}
          empty={!orders.data?.rows?.length}
          emptyTitle="No orders yet"
          emptyText="Your submitted paper trades will appear here."
        >
          <DataTable rows={orders.data?.rows} columns={orderColumns} />
        </QueryState>
      </section>
    </>
  );
}
