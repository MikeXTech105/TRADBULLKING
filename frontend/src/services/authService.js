// Development-only mock auth. Replace with backend authentication before production.
// Passwords are never persisted; signup only validates and acknowledges the form.
const credentials = {
  user: {
    email: "user@tradbullking.com",
    password: "123456",
    name: "Demo User",
  },
  admin: {
    email: "admin@tradbullking.com",
    password: "admin123",
    name: "Administrator",
  },
};
const keys = (role) => ({ token: `tbk_${role}_token`, profile: `tbk_${role}` });
const pause = () => new Promise((resolve) => setTimeout(resolve, 350));
export function validateLogin(values, admin = false) {
  const errors = {};
  const identifier = values.identifier.trim();
  if (!identifier)
    errors.identifier = admin
      ? "Enter your admin email."
      : "Enter your email or mobile number.";
  else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier) &&
    (admin || !/^\+?\d{10,15}$/.test(identifier))
  )
    errors.identifier = admin
      ? "Enter a valid email address."
      : "Enter a valid email or 10–15 digit mobile number.";
  if (!values.password) errors.password = "Enter your password.";
  return errors;
}
export function validateSignup(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = "Enter your full name.";
  if (!/^\+?\d{10,15}$/.test(values.mobile.trim()))
    errors.mobile = "Enter a valid 10–15 digit mobile number.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = "Enter a valid email address.";
  if (values.password.length < 6)
    errors.password = "Use at least 6 characters.";
  if (!values.confirmPassword)
    errors.confirmPassword = "Confirm your password.";
  else if (values.password !== values.confirmPassword)
    errors.confirmPassword = "Passwords do not match.";
  if (!values.terms)
    errors.terms = "Accept the Terms & Conditions to continue.";
  return errors;
}
async function login(role, { identifier, password, remember = false }) {
  await pause();
  const expected = credentials[role];
  if (
    identifier.trim().toLowerCase() !== expected.email ||
    password !== expected.password
  )
    throw new Error("Incorrect email or password. Please try again.");
  const profile = { name: expected.name, email: expected.email, role };
  const key = keys(role);
  // Remembered users persist; other sessions expire after 12 hours.
  const expiresAt =
    role === "user" && remember ? null : Date.now() + 12 * 60 * 60 * 1000;
  try {
    localStorage.setItem(
      key.profile,
      JSON.stringify({ ...profile, expiresAt }),
    );
    localStorage.setItem(key.token, `mock-${role}-session`);
  } catch {
    logout(role);
    throw new Error(
      "Session storage is unavailable. Enable browser storage and try again.",
    );
  }
  return profile;
}
function logout(role) {
  const key = keys(role);
  localStorage.removeItem(key.token);
  localStorage.removeItem(key.profile);
}
function current(role) {
  const key = keys(role);
  try {
    if (localStorage.getItem(key.token) !== `mock-${role}-session`) return null;
    const profile = JSON.parse(localStorage.getItem(key.profile));
    if (
      !profile ||
      profile.role !== role ||
      (profile.expiresAt && profile.expiresAt < Date.now())
    ) {
      logout(role);
      return null;
    }
    return profile;
  } catch {
    return null;
  }
}
export const loginUser = (values) => login("user", values);
export const loginAdmin = (values) => login("admin", values);
export async function signupUser(values) {
  const errors = validateSignup(values);
  if (Object.keys(errors).length)
    throw new Error("Please correct the highlighted fields.");
  await pause();
  return { success: true };
}
export const logoutUser = () => logout("user");
export const logoutAdmin = () => logout("admin");
export const getCurrentUser = () => current("user");
export const getCurrentAdmin = () => current("admin");
