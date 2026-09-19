import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

export function useOnlineStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
  return online;
}

function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="offline-banner" role="alert">
      <WifiOff size={14} />
      <span>
        No internet connection. TRADEBULLKING requires an internet connection
        for live trading data.
      </span>
    </div>
  );
}

function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => registration.update(), 60 * 60 * 1000);
    },
  });
  if (!needRefresh) return null;
  return (
    <div className="pwa-update-banner" role="status">
      <span>New TRADEBULLKING update available</span>
      <button type="button" onClick={() => updateServiceWorker(true)}>
        Update
      </button>
      <button
        type="button"
        className="dismiss"
        aria-label="Dismiss"
        onClick={() => setNeedRefresh(false)}
      >
        ×
      </button>
    </div>
  );
}

export default function PwaStatus() {
  return (
    <div className="status-banner-stack">
      <OfflineBanner />
      <UpdateBanner />
    </div>
  );
}
