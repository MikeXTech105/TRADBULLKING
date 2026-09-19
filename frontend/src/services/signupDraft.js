const KEY = "tbk_signup_draft";

export function readSignupDraft() {
  try {
    const value = JSON.parse(globalThis.sessionStorage?.getItem(KEY) || "{}");
    return {
      name: typeof value.name === "string" ? value.name : "",
      email: typeof value.email === "string" ? value.email : "",
      phone: typeof value.phone === "string" ? value.phone : "",
      acceptedTerms: value.acceptedTerms === true,
    };
  } catch {
    return { name: "", email: "", phone: "", acceptedTerms: false };
  }
}

export function saveSignupDraft(values) {
  globalThis.sessionStorage?.setItem(
    KEY,
    JSON.stringify({
      name: values.name || "",
      email: values.email || "",
      phone: values.phone || "",
      acceptedTerms: values.acceptedTerms === true,
    }),
  );
}

export function clearSignupDraft() {
  globalThis.sessionStorage?.removeItem(KEY);
}
