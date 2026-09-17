import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
export default function UserProtectedRoute() {
  return getCurrentUser() ? <Outlet /> : <Navigate to="/login" replace />;
}
