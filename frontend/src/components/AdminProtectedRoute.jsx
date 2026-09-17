import { Navigate, Outlet } from "react-router-dom";
import { getCurrentAdmin } from "../services/authService";
export default function AdminProtectedRoute() {
  return getCurrentAdmin() ? (
    <Outlet />
  ) : (
    <Navigate to="/admin/login" replace />
  );
}
