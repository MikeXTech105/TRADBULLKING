import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "../components/AuthLayout";
import { logoutUser } from "../services/authService";
export default function UserDashboard() {
  const navigate = useNavigate();
  return (
    <div className="placeholder-page">
      <header>
        <Brand />
        <Button
          variant="outlined"
          onClick={() => {
            logoutUser();
            navigate("/login", { replace: true });
          }}
        >
          Logout
        </Button>
      </header>
      <main>
        <div className="form-symbol">
          <ArrowUpRight size={25} />
        </div>
        <span className="form-eyebrow">TRADBULLKING</span>
        <h1>User Dashboard</h1>
        <p>Trading Dashboard Coming Next</p>
      </main>
    </div>
  );
}
