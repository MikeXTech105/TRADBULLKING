import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`m-toggle ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function MobileHeader({ title, children, back = false }) {
  const navigate = useNavigate();
  return (
    <header className="m-header">
      {back && (
        <button
          type="button"
          className="m-back"
          aria-label="Back"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={28} />
        </button>
      )}
      <h1>{title}</h1>
      <div className="m-header-actions">{children}</div>
    </header>
  );
}

export function PillTabs({ tabs, value, onChange, className = "" }) {
  return (
    <div className={`m-pill-tabs ${className}`} role="tablist">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          role="tab"
          aria-selected={value === key}
          className={value === key ? "active" : ""}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function MobileEmpty({ query, empty, text, children }) {
  if (query.loading && !query.data)
    return <p className="m-note">Loading…</p>;
  if (query.error)
    return (
      <p className="m-note">
        Unable to load data.{" "}
        <button className="m-link" onClick={query.retry}>
          Retry
        </button>
      </p>
    );
  if (empty) return <p className="m-note">{text}</p>;
  return children;
}
