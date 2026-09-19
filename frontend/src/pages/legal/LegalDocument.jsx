import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Brand from "../../components/Brand";
import { formatINR } from "../../utils/format";
import { PLATFORM_OFFERING } from "../../config/platform";

function interpolate(text) {
  return text
    .replace("{{TRIAL_HOURS}}", PLATFORM_OFFERING.trialHours)
    .replace("{{MEMBERSHIP_TOTAL}}", formatINR(PLATFORM_OFFERING.membershipTotal, 0))
    .replace("{{PLATFORM_FEE}}", formatINR(PLATFORM_OFFERING.platformFee, 0))
    .replace("{{FEE_CREDIT}}", formatINR(PLATFORM_OFFERING.feeBalanceCredit, 0))
    .replace("{{TRADE_FEE}}", formatINR(PLATFORM_OFFERING.tradeFee, 0));
}

export default function LegalDocument({ title, version, lastUpdated, sections }) {
  const location = useLocation();
  const fallback = title === "Privacy Policy" ? "/signup" : "/signup";
  const backTo = location.state?.from || fallback;
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);
  return (
    <main className="legal-page">
      <header className="legal-mobile-header">
        <Link to={backTo} aria-label={`Back to ${backTo === "/profile" ? "account" : "signup"}`}>
          <ArrowLeft size={19} /> Back
        </Link>
        <strong>{title}</strong>
      </header>
      <div className="legal-shell">
        <header className="legal-hero">
          <Brand />
          <p className="legal-eyebrow">LEGAL INFORMATION</p>
          <h1>{title}</h1>
          <p>
            Version {version} · Last Updated: {lastUpdated}
          </p>
          <div className="legal-draft-notice" role="note">
            Draft template — legal review and approved operator details are required before production launch.
          </div>
        </header>
        <div className="legal-layout">
          <nav className="legal-toc" aria-label={`${title} sections`}>
            <strong>Contents</strong>
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.title}
              </a>
            ))}
          </nav>
          <article className="legal-content">
            {sections.map((section) => (
              <section key={section.id} id={section.id}>
                <h2>{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{interpolate(paragraph)}</p>
                ))}
                {section.bullets && (
                  <ul>
                    {section.bullets.map((item) => (
                      <li key={item}>{interpolate(item)}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            <footer className="legal-footer-links">
              <Link to="/terms-and-conditions" state={{ from: backTo }}>
                Terms & Conditions
              </Link>
              <Link to="/privacy-policy" state={{ from: backTo }}>
                Privacy Policy
              </Link>
            </footer>
          </article>
        </div>
      </div>
    </main>
  );
}
