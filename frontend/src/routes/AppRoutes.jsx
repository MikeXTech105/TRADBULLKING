import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import AdminLogin from "../pages/admin/AdminLogin";
import UserDashboard from "../pages/UserDashboard";
import AdminDashboard from "../pages/admin/AdminDashboard";
import UserProtectedRoute from "../components/UserProtectedRoute";
import AdminProtectedRoute from "../components/AdminProtectedRoute";
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
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<UserProtectedRoute />}>
        <Route path="/dashboard" element={<UserDashboard />} />
      </Route>
      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<AdminProtectedRoute />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Route>
      <Route path="*" element={<Fallback />} />
    </Routes>
  );
}
