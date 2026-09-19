const listeners = new Set();
let sequence = 0;
const recentMessages = new Map();

const defaults = {
  success: 3000,
  info: 3800,
  warning: 4800,
  error: 5500,
  loading: null,
};

function emit(event) {
  listeners.forEach((listener) => listener(event));
}

export function subscribeToasts(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function showToast(message, options = {}) {
  if (!message) return null;
  const text = String(message);
  if (!options.id) {
    const recent = recentMessages.get(text);
    if (recent && Date.now() - recent.time < 2000) return recent.id;
  }
  const severity = options.severity || "info";
  const id = options.id || `toast-${Date.now()}-${++sequence}`;
  recentMessages.set(text, { id, time: Date.now() });
  emit({
    type: "show",
    toast: {
      id,
      message: text,
      severity,
      duration:
        options.persist || severity === "loading"
          ? null
          : (options.duration ?? defaults[severity] ?? defaults.info),
    },
  });
  return id;
}

export const toastSuccess = (message, options) =>
  showToast(message, { ...options, severity: "success" });
export const toastError = (message, options) =>
  showToast(message, { ...options, severity: "error" });
export const toastWarning = (message, options) =>
  showToast(message, { ...options, severity: "warning" });
export const toastInfo = (message, options) =>
  showToast(message, { ...options, severity: "info" });
export const toastLoading = (message, options) =>
  showToast(message, { ...options, severity: "loading", persist: true });

export function dismissToast(id) {
  emit({ type: "dismiss", id });
}

export async function toastPromise(promise, messages, options = {}) {
  const id = toastLoading(messages.loading, options);
  try {
    const result = await promise;
    toastSuccess(
      typeof messages.success === "function"
        ? messages.success(result)
        : messages.success,
      { ...options, id },
    );
    return result;
  } catch (error) {
    toastError(
      typeof messages.error === "function" ? messages.error(error) : messages.error,
      { ...options, id },
    );
    throw error;
  }
}
