import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Button } from "@mui/material";
import { Wallet as WalletIcon } from "lucide-react";
import { PageHeader, StatCards } from "../../components/DataView";
export default function Wallet() {
  const user = useSelector((s) => s.auth.user);
  return (
    <>
      <PageHeader
        title="Wallet"
        description="Your paper trading capital and platform fee balance."
        action={
          <Button variant="contained" component={Link} to="/membership">
            Recharge fee balance
          </Button>
        }
      />
      <StatCards
        data={user}
        fields={[
          ["dummyBalance", "Dummy trading balance"],
          ["feeBalance", "Trade fee balance"],
        ]}
      />
      <section className="surface wallet-explainer">
        <WalletIcon size={32} />
        <h2>Two balances. One clear purpose.</h2>
        <p>
          Dummy funds are used for paper trades and cannot be withdrawn. Your
          fee balance covers the platform's trade charges.
        </p>
        <p>
          Membership and recharge payments are processed through the membership
          page. Balances update only after the server confirms payment.
        </p>
        <Button component={Link} to="/payments">
          View payment history
        </Button>
      </section>
    </>
  );
}
