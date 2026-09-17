import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Brand } from "../../components/AuthLayout";
import { logoutAdmin } from "../../services/authService";
export default function AdminDashboard() {
  const navigate = useNavigate();
  return (
    <div className="placeholder-page">
      <header>
        <Brand admin />
        <Button
          variant="outlined"
          onClick={() => {
            logoutAdmin();
            navigate("/admin/login", { replace: true });
          }}
        >
          Logout
        </Button>
      </header>
      <main>
        <div className="form-symbol">
          <ShieldCheck size={25} />
        </div>
        <span className="form-eyebrow">TRADBULLKING ADMIN</span>
        <h1>Admin Dashboard</h1>
        <p>Admin Modules Coming Next</p>
      </main>
    </div>
  );
}
