import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ShieldCheck, LockKeyhole } from "lucide-react";
export function Brand({ admin = false }) {
  const [failed, setFailed] = useState(false);
  return (
    <Link
      className="brand"
      to={admin ? "/admin/login" : "/login"}
      aria-label={admin ? "TRADBULLKING ADMIN" : "TRADBULLKING"}
    >
      {failed ? (
        <strong>
          TRAD<span>BULL</span>KING
        </strong>
      ) : (
        <img
          src="/logo.png"
          alt="TRADBULLKING"
          onError={() => setFailed(true)}
        />
      )}{" "}
      {admin && <span className="admin-label">ADMIN</span>}
    </Link>
  );
}
export default function AuthLayout({
  children,
  admin = false,
  signup = false,
}) {
  return (
    <div className="auth-layout">
      <aside className="brand-panel">
        <Brand admin={admin} />
        <div className="brand-story">
          <span className="eyebrow">
            <span className="red-line" />
            {admin ? "ADMINISTRATIVE PORTAL" : "A HIGHER STANDARD"}
          </span>
          <h1>
            {admin ? (
              <>
                Confidence.
                <br />
                Control.
                <br />
                <span>Clarity.</span>
              </>
            ) : (
              <>
                Your ambition.
                <br />
                Our foundation.
                <br />
                <span>Rise higher.</span>
              </>
            )}
          </h1>
          <p>
            {admin
              ? "A dedicated space for the people behind TRADBULLKING."
              : "Every great journey begins with a clear focus. Take your next step with TRADBULLKING."}
          </p>
          <div className="brand-motto">
            TRADE SMARTER <span className="motto-divider">—</span> TRADE HIGHER
          </div>
        </div>
        <div className="panel-bottom">
          <ShieldCheck size={18} />
          <span>
            {admin
              ? "Dedicated administrator access"
              : "Built for your next chapter"}
          </span>
          <span className="edition">EST. 2026</span>
        </div>
        <div className="decor" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </aside>
      <section className={`form-panel ${signup ? "signup-panel" : ""}`}>
        <header className="mobile-brand">
          <Brand admin={admin} />
          <span className="mobile-tagline">TRADE SMARTER — TRADE HIGHER</span>
        </header>
        <div className="portal-nav">
          <span>{admin ? "ADMIN PORTAL" : "USER PORTAL"}</span>
          <Link to={admin ? "/login" : "/admin/login"}>
            {admin ? "User login" : "Admin access"}
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <main className="form-content">{children}</main>
        <footer className="form-footer">
          <span>© {new Date().getFullYear()} TRADBULLKING</span>
          <span>
            <LockKeyhole size={13} />{" "}
            {admin ? "Administrator access" : "Your journey starts here"}
          </span>
        </footer>
      </section>
    </div>
  );
}
