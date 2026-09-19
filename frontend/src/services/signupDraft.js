const KEY = "tbk_signup_draft";

export function readSignupDraft() {
  try {
    const value = JSON.parse(globalThis.sessionStorage?.getItem(KEY) || "{}");
    return {
      name: typeof value.name === "string" ? value.name : "",
      userName: typeof value.userName === "string" ? value.userName : "",
      email: typeof value.email === "string" ? value.email : "",
      phone: typeof value.phone === "string" ? value.phone : "",
      referralCode:
        typeof value.referralCode === "string" ? value.referralCode : "",
      acceptedTerms: value.acceptedTerms === true,
    };
  } catch {
    return {
      name: "",
      userName: "",
      email: "",
      phone: "",
      referralCode: "",
      acceptedTerms: false,
    };
  }
}

export function saveSignupDraft(values) {
  globalThis.sessionStorage?.setItem(
    KEY,
    JSON.stringify({
      name: values.name || "",
      userName: values.userName || "",
      email: values.email || "",
      phone: values.phone || "",
      referralCode: values.referralCode || "",
      acceptedTerms: values.acceptedTerms === true,
    }),
  );
}

export function clearSignupDraft() {
  globalThis.sessionStorage?.removeItem(KEY);
}
