import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { getProfile } from "../services/authService";
import { readSession } from "../services/session";
import { QueryState } from "./Feedback";
import { BrandLogo } from "./Brand";
export default function ProtectedRoute({ role }) {
  const user = useSelector((state) => state.auth[role]);
  const authenticated = Boolean(readSession(role)?.accessToken);
  const [state, setState] = useState({ loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (!authenticated) {
      setState({ loading: false, error: null });
      return;
    }
    setState({ loading: true, error: null });
    getProfile(role)
      .then(() => {
        if (active) setState({ loading: false, error: null });
      })
      .catch((error) => {
        if (active) setState({ loading: false, error });
      });
    return () => {
      active = false;
    };
  }, [role, authenticated, attempt]);
  if (!authenticated)
    return (
      <Navigate to={role === "admin" ? "/admin/login" : "/login"} replace />
    );
  if (state.loading || state.error)
    return (
      <div className="session-check">
        <BrandLogo className="loading-brand" />
        <QueryState
          query={{ ...state, retry: () => setAttempt((n) => n + 1) }}
        />
      </div>
    );
  if (user?.role !== role)
    return (
      <Navigate to={role === "admin" ? "/admin/login" : "/login"} replace />
    );
  return <Outlet />;
}
