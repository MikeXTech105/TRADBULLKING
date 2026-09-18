import { Link } from "react-router-dom";
import { Button } from "@mui/material";
import { useQuery } from "../../hooks/useQuery";
import useAutoRefresh from "../../hooks/useAutoRefresh";
import { orderService } from "../../services/orderService";
import {
  PageHeader,
  StatCards,
  portfolioFields,
} from "../../components/DataView";
import { QueryState } from "../../components/Feedback";
const pnlFields = [
  ["totalPnl", "Total P&L", "pnl"],
  ["realizedPnl", "Realized P&L", "pnl"],
  ["unrealizedPnl", "Unrealized P&L", "pnl"],
  ["winRate", "Win rate", "percent"],
  ["totalTrades", "Total trades", "number"],
  ["profitableTrades", "Profitable trades", "number"],
  ["losingTrades", "Losing trades", "number"],
  ["maxProfit", "Largest profit", "pnl"],
  ["maxLoss", "Largest loss", "pnl"],
];
export default function Portfolio() {
  const summary = useQuery((signal) => orderService.portfolio(signal));
  const pnl = useQuery((signal) => orderService.pnl(signal));
  useAutoRefresh(summary, 15000);
  useAutoRefresh(pnl, 15000);
  return (
    <>
      <PageHeader
        title="Portfolio"
        description="Know your capital. Understand your performance."
        action={
          <Button component={Link} to="/positions" variant="outlined">
            View positions
          </Button>
        }
      />
      <QueryState query={summary}>
        <StatCards data={summary.data} fields={portfolioFields} />
      </QueryState>
      <section className="surface">
        <div className="section-heading">
          <h2>Profit & loss</h2>
          <span>Server-calculated performance</span>
        </div>
        <QueryState query={pnl}>
          <StatCards data={pnl.data} fields={pnlFields} primaryCount={1} />
        </QueryState>
      </section>
      <div className="information-strip">
        Balances and performance are supplied by TRADBULLKING. Paper trading
        funds have no cash value.
      </div>
    </>
  );
}
