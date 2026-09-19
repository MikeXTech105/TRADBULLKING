import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect } from "react";
import {
  LayoutDashboard,
  List,
  ChartNoAxesCombined,
  ClipboardList,
  Layers,
  PieChart,
  Menu as MenuIcon,
  BriefcaseBusiness,
  Trophy,
  Wallet,
  Crown,
  CreditCard,
  UserRound,
  ArrowUpRight,
} from "lucide-react";
import {
  WorkspaceSidebar,
  WorkspaceHeader,
} from "../components/WorkspaceChrome";
import TrialStatusBanner from "../components/TrialStatusBanner";
import { logoutUser, getProfile } from "../services/authService";
import { toastSuccess } from "../services/toastService";
const navigation = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/watchlist", "Watchlist", List],
  ["/market", "Market", ChartNoAxesCombined],
  ["/orders", "Orders", ClipboardList],
  ["/positions", "Positions", Layers],
  ["/portfolio", "Portfolio", BriefcaseBusiness],
  ["/leaderboard", "Leaderboard", Trophy],
  ["/wallet", "Wallet", Wallet],
  ["/membership", "Membership", Crown],
  ["/payments", "Payments", CreditCard],
  ["/profile", "Account", UserRound],
];
const mobile = [
  ["/watchlist", "Watchlist", ChartNoAxesCombined],
  ["/orders", "Trades", ClipboardList],
  ["/positions", "Position", PieChart],
  ["/profile", "Accounts", UserRound],
  ["/more", "More", MenuIcon],
];
// Screens that draw their own header on phones (see mobile.css).
const ownHeader = ["/watchlist", "/orders", "/positions", "/profile", "/report", "/more"];
export default function UserLayout() {
  useEffect(() => {
    let running = false;
    const refresh = async () => {
      if (document.hidden || running) return;
      running = true;
      try {
        await getProfile();
      } catch {
        /* Query pages surface connection issues; keep last server profile. */
      } finally {
        running = false;
      }
    };
    const timer = setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const logout = () => {
    logoutUser();
    toastSuccess("Logged out successfully.", { id: "user-logout" });
    navigate("/login", { replace: true });
  };
  return (
    <div
      className={`app-shell ${ownHeader.includes(pathname) ? "m-screen" : ""}`}
    >
      <WorkspaceSidebar links={navigation} user={user} onLogout={logout} />
      <div className="app-main">
        <WorkspaceHeader links={navigation} user={user} onLogout={logout} />
        <div className="content-wrap">
          {!pathname.startsWith("/trade/") && <TrialStatusBanner />}
          <Outlet />
        </div>
        <footer className="app-footer">
          <span>TRADE SMARTER — TRADE HIGHER</span>
          <span>
            Paper trading · Prices supplied by backend{" "}
            <ArrowUpRight size={12} />
          </span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {mobile.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive ||
              (to === "/watchlist" &&
                (pathname === "/market" || pathname.startsWith("/trade/")))
                ? "active"
                : ""
            }
          >
            <span className="bn-icon">
              <Icon size={19} />
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
