import { useState } from "react";
import { Link } from "react-router-dom";

export const brandAssets = {
  full: "/branding/Tradebullking-logo-full.png",
  transparent: "/branding/Tradebullking-logo-transparent.png",
};

export function BrandLogo({ variant = "full", className = "" }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <strong className="brand-fallback">TRADEBULLKING</strong>
  ) : (
    <img
      className={`brand-logo ${className}`}
      src={brandAssets[variant] || brandAssets.full}
      alt="TRADE KING — Trade Smarter, Trade Higher"
      width={1744}
      height={608}
      onError={() => setFailed(true)}
    />
  );
}

export default function Brand({ admin = false, variant = "full" }) {
  return (
    <Link
      className={`brand brand-${variant}`}
      to={admin ? "/admin/login" : "/login"}
      aria-label={admin ? "TRADEBULLKING ADMIN" : "TRADEBULLKING"}
    >
      <BrandLogo variant={variant} />
      {admin && <span className="admin-label">ADMIN</span>}
    </Link>
  );
}
