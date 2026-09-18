const DISMISS_KEY = "tbk_pwa_install_dismissed_until";
const DISMISS_COOLDOWN_DAYS = 5;

let deferredPrompt = null;
let justInstalled = false;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    window.navigator?.standalone === true
  );
}

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS13Up =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS13Up;
}

// unsupported | eligible | iosInstructions | installed
export function computeStatus() {
  if (isStandalone()) return "installed";
  if (deferredPrompt) return "eligible";
  if (isIosDevice()) return "iosInstructions";
  return "unsupported";
}

function getDismissedUntil() {
  try {
    const value = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function isDismissed() {
  return Date.now() < getDismissedUntil();
}

export function dismissInstall(days = DISMISS_COOLDOWN_DAYS) {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 86400000));
  } catch {
    /* localStorage unavailable */
  }
  emit();
}

function clearDismissal() {
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch {
    /* localStorage unavailable */
  }
}

// Resolves to the browser's { outcome, platform } choice, or null when no
// captured prompt is available (already consumed, or platform unsupported).
export async function triggerInstall() {
  if (!deferredPrompt) return null;
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  emit();
  promptEvent.prompt();
  try {
    return await promptEvent.userChoice;
  } catch {
    return null;
  }
}

export function wasJustInstalled() {
  return justInstalled;
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    justInstalled = true;
    clearDismissal();
    emit();
  });
  window.matchMedia?.("(display-mode: standalone)")?.addEventListener?.(
    "change",
    emit,
  );
}
