import { useEffect, useRef, useState } from "react";
import { Alert, CircularProgress, Stack, useMediaQuery } from "@mui/material";
import { useLocation } from "react-router-dom";
import { subscribeToasts, toastSuccess, toastWarning } from "../services/toastService";

export default function ToastProvider({ children }) {
  const mobile = useMediaQuery("(max-width: 767px)");
  const { pathname } = useLocation();
  const authScreen = ["/login", "/signup", "/admin/login"].includes(pathname);
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  useEffect(() => {
    const remove = (id) => {
      const timer = timers.current.get(id);
      if (timer) clearTimeout(timer);
      timers.current.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    };
    return subscribeToasts((event) => {
      if (event.type === "dismiss") return remove(event.id);
      const incoming = event.toast;
      setToasts((current) => {
        const existing = current.find((toast) => toast.id === incoming.id);
        const next = existing
          ? current.map((toast) => (toast.id === incoming.id ? incoming : toast))
          : [...current, incoming];
        return next.slice(-3);
      });
      const previous = timers.current.get(incoming.id);
      if (previous) clearTimeout(previous);
      if (incoming.duration)
        timers.current.set(
          incoming.id,
          setTimeout(() => remove(incoming.id), incoming.duration),
        );
    });
  }, []);

  useEffect(() => {
    let wasOffline = !navigator.onLine;
    const offline = () => {
      wasOffline = true;
      toastWarning("No internet connection.", {
        id: "network-offline",
        persist: true,
      });
    };
    const online = () => {
      if (!wasOffline) return;
      wasOffline = false;
      toastSuccess("Internet connection restored.", {
        id: "network-offline",
        duration: 2500,
      });
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    if (wasOffline) offline();
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);

  return (
    <>
      {children}
      <Stack
        aria-label="Notifications"
        spacing={1}
        sx={{
          position: "fixed",
          zIndex: 1600,
          top: mobile
            ? `calc(${authScreen ? 218 : 70}px + env(safe-area-inset-top))`
            : "calc(18px + env(safe-area-inset-top))",
          right: mobile ? 12 : 18,
          left: mobile ? 12 : "auto",
          width: mobile ? "auto" : 360,
          maxWidth: "calc(100vw - 24px)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => {
          const severity = toast.severity === "loading" ? "info" : toast.severity;
          return (
            <Alert
              key={toast.id}
              severity={severity}
              role={severity === "error" || severity === "warning" ? "alert" : "status"}
              aria-live={severity === "error" ? "assertive" : "polite"}
              icon={
                toast.severity === "loading" ? (
                  <CircularProgress size={18} color="inherit" />
                ) : undefined
              }
              onClose={() => {
                const timer = timers.current.get(toast.id);
                if (timer) clearTimeout(timer);
                timers.current.delete(toast.id);
                setToasts((current) => current.filter((item) => item.id !== toast.id));
              }}
              variant="outlined"
              sx={{
                alignItems: "center",
                bgcolor: "background.paper",
                color: "text.primary",
                borderRadius: "10px",
                boxShadow: "0 10px 30px rgba(15, 23, 42, .14)",
                py: 0.5,
                pr: 0.5,
                pointerEvents: "auto",
                overflowWrap: "anywhere",
                "& .MuiAlert-message": { fontSize: 13, fontWeight: 600, py: 0.75 },
              }}
            >
              {toast.message}
            </Alert>
          );
        })}
      </Stack>
    </>
  );
}
