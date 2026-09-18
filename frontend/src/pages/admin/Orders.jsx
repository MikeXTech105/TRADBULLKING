import { Link } from "react-router-dom";
import { Button } from "@mui/material";
import { PageHeader } from "../../components/DataView";
export default function Orders() {
  return (
    <>
      <PageHeader eyebrow="TRADING OPERATIONS" title="User trading history" />
      <section className="surface empty-state">
        <h2>Review trades by user</h2>
        <p>
          The platform API provides trading history through individual user
          accounts. Select a user to review orders and P&L.
        </p>
        <Button component={Link} to="/admin/users" variant="contained">
          View users
        </Button>
      </section>
    </>
  );
}
