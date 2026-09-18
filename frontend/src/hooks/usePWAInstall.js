import { useEffect, useState } from "react";
import {
  computeStatus,
  dismissInstall,
  isDismissed,
  subscribe,
  triggerInstall,
} from "../services/pwaInstall";

export function usePWAInstall() {
  const [, bump] = useState(0);
  useEffect(() => subscribe(() => bump((n) => n + 1)), []);
  const status = computeStatus();
  const dismissed = isDismissed();
  return {
    status,
    dismissed,
    isIos: status === "iosInstructions",
    // Auto-prompt eligibility: installable/instructable and not snoozed.
    canPromote:
      (status === "eligible" || status === "iosInstructions") && !dismissed,
    // Manual entry point (Account page) stays available regardless of snooze.
    canInstallManually: status === "eligible" || status === "iosInstructions",
    install: triggerInstall,
    dismiss: dismissInstall,
  };
}
