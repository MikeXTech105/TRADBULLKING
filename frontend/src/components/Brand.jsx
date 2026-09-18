import { useState } from "react";
import { Link } from "react-router-dom";

export const brandAssets = {
  full: "/branding/tradbullking-logo-full.png",
  transparent: "/branding/tradbullking-logo-transparent.png",
};

export function BrandLogo({ variant = "full", className = "" }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <strong className="brand-fallback">TRADBULLKING</strong>
  ) : (
    <img
      className={`brand-logo ${className}`}
      src={brandAssets[variant] || brandAssets.full}
      alt="TRADBULLKING"
      width={variant === "transparent" ? 866 : 2172}
      height={variant === "transparent" ? 288 : 724}
      onError={() => setFailed(true)}
    />
  );
}

export default function Brand({ admin = false, variant = "full" }) {
  return (
    <Link
      className={`brand brand-${variant}`}
      to={admin ? "/admin/login" : "/login"}
      aria-label={admin ? "TRADBULLKING ADMIN" : "TRADBULLKING"}
    >
      <BrandLogo variant={variant} />
      {admin && <span className="admin-label">ADMIN</span>}
    </Link>
  );
}
