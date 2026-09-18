import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useSelector } from "react-redux";
import { Drawer, useMediaQuery } from "@mui/material";
import {
  LayoutDashboard,
  Users,
  ChartNoAxesCombined,
  Trophy,
  Settings,
  ClipboardList,
} from "lucide-react";
import {
  WorkspaceSidebar,
  WorkspaceHeader,
} from "../components/WorkspaceChrome";
import { logoutAdmin } from "../services/authService";
const links = [
  ["/admin/dashboard", "Dashboard", LayoutDashboard],
  ["/admin/users", "Users", Users],
  ["/admin/stocks", "Instruments", ChartNoAxesCombined],
  ["/admin/orders", "Trading history", ClipboardList],
  ["/admin/leaderboard", "Leaderboard", Trophy],
  ["/admin/settings", "Settings & account", Settings],
];
export default function AdminLayout() {
  const navigate = useNavigate();
  const mobile = useMediaQuery("(max-width: 767px)");
  const [open, setOpen] = useState(false);
  const user = useSelector((s) => s.auth.admin);
  const logout = () => {
    logoutAdmin();
    setOpen(false);
    navigate("/admin/login", { replace: true });
  };
  const sidebar = (
    <WorkspaceSidebar
      links={links}
      user={user}
      admin
      onNavigate={() => setOpen(false)}
      onLogout={logout}
    />
  );
  return (
    <div className="app-shell admin-shell">
      {mobile ? (
        <Drawer
          className="navigation-drawer"
          open={open}
          onClose={() => setOpen(false)}
        >
          {sidebar}
        </Drawer>
      ) : (
        sidebar
      )}
      <div className="app-main">
        <WorkspaceHeader
          links={links}
          user={user}
          admin
          onOpenNavigation={mobile ? () => setOpen(true) : undefined}
          onLogout={logout}
        />
        <main className="content-wrap">
          <Outlet />
        </main>
        <footer className="app-footer">TRADBULLKING · Administration</footer>
      </div>
    </div>
  );
}
