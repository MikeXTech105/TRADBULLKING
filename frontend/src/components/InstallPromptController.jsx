import { useEffect, useRef, useState } from "react";
import { usePWAInstall } from "../hooks/usePWAInstall";
import InstallAppPrompt from "./InstallAppPrompt";
import { subscribe, wasJustInstalled } from "../services/pwaInstall";
import { toastSuccess } from "../services/toastService";

const SHOW_DELAY_MS = 3000;

export default function InstallPromptController() {
  const { status, canPromote, install, dismiss } = usePWAInstall();
  const [open, setOpen] = useState(false);
  const shown = useRef(false);

  useEffect(() => {
    if (!canPromote || shown.current) return;
    const timer = setTimeout(() => {
      shown.current = true;
      setOpen(true);
    }, SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [canPromote]);

  // appinstalled fires in the current (still non-standalone) tab, so this
  // must not depend on live install status — otherwise the status flips to
  // "unsupported" the instant the deferred prompt is consumed and the
  // success toast never gets a chance to render.
  useEffect(
    () =>
      subscribe(() => {
        if (wasJustInstalled()) {
          setOpen(false);
          toastSuccess("TRADBULLKING installed successfully.", {
            id: "pwa-installed",
          });
        }
      }),
    [],
  );

  const showPrompt = status === "eligible" || status === "iosInstructions";

  return (
    <>
      {showPrompt && (
        <InstallAppPrompt
          open={open}
          variant={status === "iosInstructions" ? "ios" : "android"}
          onClose={() => setOpen(false)}
          onDismiss={() => {
            setOpen(false);
            dismiss();
          }}
          onInstall={async () => {
            const choice = await install();
            setOpen(false);
            if (choice?.outcome !== "accepted") dismiss();
          }}
        />
      )}
    </>
  );
}
