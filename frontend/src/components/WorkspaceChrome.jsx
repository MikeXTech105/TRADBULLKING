import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Avatar, IconButton, Menu, MenuItem } from "@mui/material";
import {
  ChevronDown,
  ChevronRight,
  Home,
  LogOut,
  Menu as MenuIcon,
  Search,
  UserRound,
} from "lucide-react";
import Brand from "./Brand";
import { formatINR } from "../utils/format";
export function WorkspaceSidebar({
  links,
  user,
  admin = false,
  onNavigate,
  onLogout,
}) {
  const [filter, setFilter] = useState("");
  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <Brand admin={admin} variant="transparent" />
        <span>TRADE SMARTER — TRADE HIGHER</span>
      </div>
      <label className="menu-search">
        <Search size={16} />
        <input
          aria-label="Search menu"
          placeholder="Search menu"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </label>
      <span className="sidebar-label">
        {admin ? "ADMINISTRATION" : "TRADING WORKSPACE"}
      </span>
      <nav aria-label={admin ? "Admin navigation" : "Trading navigation"}>
        {links
          .filter(([, label]) =>
            label.toLowerCase().includes(filter.toLowerCase()),
          )
          .map(([to, label, Icon]) => (
            <NavLink key={to} to={to} onClick={onNavigate}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        {filter &&
          !links.some(([, label]) =>
            label.toLowerCase().includes(filter.toLowerCase()),
          ) && <p className="menu-empty">No matching pages</p>}
      </nav>
      <div className="sidebar-bottom">
        <Link
          className="sidebar-profile"
          to={admin ? "/admin/settings" : "/profile"}
          onClick={onNavigate}
        >
          <span className="sidebar-avatar">
            {user?.name?.slice(0, 1).toUpperCase() || <UserRound size={18} />}
          </span>
          <span>
            <strong>{user?.name || "Your account"}</strong>
            <small>{admin ? "Administrator" : "Paper trading account"}</small>
          </span>
        </Link>
        <button className="sidebar-logout" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
export function WorkspaceHeader({
  links,
  user,
  admin = false,
  onOpenNavigation,
  onLogout,
}) {
  const { pathname } = useLocation();
  const [anchor, setAnchor] = useState(null);
  const current = links.find(
    ([to]) => pathname === to || pathname.startsWith(`${to}/`),
  );
  const title = pathname.startsWith("/trade/")
    ? "Trade"
    : current?.[1] || "Workspace";
  return (
    <header className="app-header">
      {onOpenNavigation && (
        <IconButton
          className="header-menu"
          aria-label="Open admin navigation"
          onClick={onOpenNavigation}
        >
          <MenuIcon size={21} />
        </IconButton>
      )}
      <div className="header-brand">
        <Brand admin={admin} variant="transparent" />
      </div>
      <div className="header-breadcrumb">
        <Link
          to={admin ? "/admin/dashboard" : "/dashboard"}
          aria-label="Overview"
        >
          <Home size={16} />
        </Link>
        <ChevronRight size={14} />
        <span>{title}</span>
      </div>
      <div className="header-account">
        {!admin && (
          <div className="header-balance">
            <span>Virtual balance</span>
            <strong>{formatINR(user?.dummyBalance, 0)}</strong>
          </div>
        )}
        <button
          className="profile-trigger"
          aria-label="Open account menu"
          aria-haspopup="menu"
          aria-expanded={Boolean(anchor)}
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          <Avatar className="avatar">
            {user?.name?.slice(0, 1).toUpperCase() || <UserRound size={18} />}
          </Avatar>
          <span>
            <strong>
              {user?.name || (admin ? "Administrator" : "Your account")}
            </strong>
            <small>{admin ? "Administrator" : "Paper trading account"}</small>
          </span>
          <ChevronDown size={16} />
        </button>
        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
        >
          <MenuItem
            component={Link}
            to={admin ? "/admin/settings" : "/profile"}
            onClick={() => setAnchor(null)}
          >
            Account & settings
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onLogout();
            }}
          >
            Logout
          </MenuItem>
        </Menu>
      </div>
    </header>
  );
}
