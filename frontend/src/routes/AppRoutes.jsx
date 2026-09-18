import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import UserProtectedRoute from "../components/UserProtectedRoute";
import AdminProtectedRoute from "../components/AdminProtectedRoute";
import UserLayout from "../layouts/UserLayout";
import AdminLayout from "../layouts/AdminLayout";
import { Skeleton } from "@mui/material";
const Login = lazy(() => import("../pages/auth/Login"));
const Signup = lazy(() => import("../pages/auth/Signup"));
const AdminLogin = lazy(() => import("../pages/admin/AdminLogin"));
const Dashboard = lazy(() => import("../pages/user/Dashboard"));
const Market = lazy(() => import("../pages/user/Market"));
const Watchlist = lazy(() => import("../pages/user/Watchlist"));
const Trade = lazy(() => import("../pages/user/Trade"));
const Orders = lazy(() => import("../pages/user/Orders"));
const Positions = lazy(() => import("../pages/user/Positions"));
const Portfolio = lazy(() => import("../pages/user/Portfolio"));
const Leaderboard = lazy(() => import("../pages/user/Leaderboard"));
const Wallet = lazy(() => import("../pages/user/Wallet"));
const Membership = lazy(() => import("../pages/user/Membership"));
const Payments = lazy(() => import("../pages/user/Payments"));
const Profile = lazy(() => import("../pages/user/Profile"));
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("../pages/admin/Users"));
const AdminUserDetail = lazy(() =>
  import("../pages/admin/Users").then((module) => ({
    default: module.UserDetail,
  })),
);
const AdminStocks = lazy(() => import("../pages/admin/Stocks"));
const AdminLeaderboard = lazy(() => import("../pages/admin/Leaderboard"));
const AdminSettings = lazy(() => import("../pages/admin/Settings"));
const AdminOrders = lazy(() => import("../pages/admin/Orders"));
function Fallback() {
  const { pathname } = useLocation();
  return (
    <Navigate
      to={
        pathname === "/admin" || pathname.startsWith("/admin/")
          ? "/admin/login"
          : "/login"
      }
      replace
    />
  );
}
export default function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="route-loading">
          <Skeleton height={65} />
          <Skeleton variant="rounded" height={250} />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<UserProtectedRoute />}>
          <Route element={<UserLayout />}>
            {[
              ["/dashboard", Dashboard],
              ["/watchlist", Watchlist],
              ["/market", Market],
              ["/trade/:stockId", Trade],
              ["/orders", Orders],
              ["/positions", Positions],
              ["/portfolio", Portfolio],
              ["/leaderboard", Leaderboard],
              ["/wallet", Wallet],
              ["/membership", Membership],
              ["/payments", Payments],
              ["/profile", Profile],
            ].map(([path, Page]) => (
              <Route key={path} path={path} element={<Page />} />
            ))}
          </Route>
        </Route>
        <Route element={<AdminProtectedRoute />}>
          <Route element={<AdminLayout />}>
            {[
              ["/admin/dashboard", AdminDashboard],
              ["/admin/users", AdminUsers],
              ["/admin/users/:id", AdminUserDetail],
              ["/admin/stocks", AdminStocks],
              ["/admin/orders", AdminOrders],
              ["/admin/leaderboard", AdminLeaderboard],
              ["/admin/settings", AdminSettings],
            ].map(([path, Page]) => (
              <Route key={path} path={path} element={<Page />} />
            ))}
          </Route>
        </Route>
        <Route path="*" element={<Fallback />} />
      </Routes>
    </Suspense>
  );
}
