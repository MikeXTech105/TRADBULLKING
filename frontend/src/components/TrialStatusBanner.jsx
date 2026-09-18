import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Clock3, ArrowUpRight } from "lucide-react";
export default function TrialStatusBanner() {
  const user = useSelector((state) => state.auth.user);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  if (!user || user.isPremium) return null;
  const end = Date.parse(user.trialEndDate);
  const remaining = Number.isFinite(end) ? Math.max(0, end - now) : null;
  const active = user.isTrialActive === true;
  const expired = user.isTrialActive === false;
  if (!active && !expired) return null;
  return (
    <div className={`trial-banner ${expired ? "expired" : ""}`}>
      <Clock3 size={17} />
      <span>
        {active ? (
          <>
            <strong>Free Trial</strong>
            {remaining !== null && remaining > 0 && (
              <span>
                {" "}
                · {Math.floor(remaining / 3600000)}h{" "}
                {Math.floor((remaining % 3600000) / 60000)}m remaining
              </span>
            )}
            {remaining === 0 && (
              <span> · Refresh your account to check trading access</span>
            )}
          </>
        ) : (
          "Your free trading trial has ended."
        )}
      </span>
      <Link to="/membership">
        {expired ? "Continue Membership" : "Explore Membership"}
        <ArrowUpRight size={15} />
      </Link>
    </div>
  );
}
