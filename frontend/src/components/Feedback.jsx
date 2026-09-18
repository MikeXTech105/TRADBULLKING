import { useEffect, useState } from "react";
import { Alert, Button, Skeleton, Snackbar } from "@mui/material";
import { Inbox, RefreshCw } from "lucide-react";
import { errorMessage } from "../services/api";
export function SlowNotice({ busy }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!busy) return;
    const timer = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(timer);
  }, [busy]);
  return slow ? (
    <p className="slow-notice" role="status">
      Connecting to TRADBULLKING servers…
    </p>
  ) : null;
}
export function QueryState({
  query,
  children,
  empty = false,
  emptyTitle = "Nothing here yet",
  emptyText = "Your records will appear here.",
  action,
  skeleton = "rows",
}) {
  if (query.loading && !query.data)
    return (
      <div
        aria-label="Loading data"
        className={`query-loading loading-${skeleton}`}
      >
        {(skeleton === "chart" ? [1] : [1, 2, 3, 4]).map((n) => (
          <Skeleton
            key={n}
            variant="rounded"
            height={
              skeleton === "chart" ? 380 : skeleton === "metrics" ? 104 : 62
            }
            sx={{ mb: 1 }}
          />
        ))}
        {query.slow && (
          <p className="slow-notice" role="status">
            Connecting to TRADBULLKING servers…
          </p>
        )}
      </div>
    );
  if (query.error)
    return (
      <div className="error-state">
        <Alert severity="error">{errorMessage(query.error)}</Alert>
        <Button onClick={query.retry} startIcon={<RefreshCw size={16} />}>
          Retry
        </Button>
      </div>
    );
  if (empty)
    return (
      <div className="empty-state">
        <span className="empty-icon">
          <Inbox size={27} />
        </span>
        <h3>{emptyTitle}</h3>
        <p>{emptyText}</p>
        {action}
      </div>
    );
  return children;
}
export function Notice({ notice, onClose }) {
  return (
    <Snackbar
      open={Boolean(notice)}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        severity={notice?.severity || "success"}
        onClose={onClose}
        variant="filled"
      >
        {notice?.message}
      </Alert>
    </Snackbar>
  );
}
