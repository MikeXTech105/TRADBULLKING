import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, LogOut } from "lucide-react";
import { logoutUser } from "../services/authService";
import { toastSuccess } from "../services/toastService";
import { BrandLogo } from "../components/Brand";
import { MobileHeader } from "./Parts";

const links = [
  ["/dashboard", "Overview"],
  ["/market", "Market"],
  ["/report", "Valan (Bill)"],
  ["/portfolio", "Portfolio Summary"],
  ["/leaderboard", "Leaderboard"],
  ["/wallet", "Wallet"],
  ["/membership", "Membership"],
  ["/payments", "Payments"],
  ["/terms-and-conditions", "Terms & Conditions"],
  ["/privacy-policy", "Privacy Policy"],
];

export default function More() {
  const navigate = useNavigate();
  return (
    <div className="m-screen-body">
      <MobileHeader title="More" />
      <div className="m-more-logo">
        <BrandLogo />
      </div>
      <nav className="m-more-list" aria-label="More">
        {links.map(([to, label]) => (
          <Link key={to} to={to}>
            <span>{label}</span>
            <ChevronRight size={18} />
          </Link>
        ))}
        <button
          onClick={() => {
            logoutUser();
            toastSuccess("Logged out successfully.", { id: "user-logout" });
            navigate("/login", { replace: true });
          }}
        >
          <span>Logout</span>
          <LogOut size={18} />
        </button>
      </nav>
    </div>
  );
}
