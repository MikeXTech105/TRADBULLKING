import { publicApi, userApi, adminApi } from "./api.js";
import { profile, tokens, unwrap } from "./adapters.js";
import {
  saveSession,
  readSession,
  updateSession,
  clearSession,
  validRole,
} from "./session.js";
export function validateLogin(values) {
  const errors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = "Enter a valid email address.";
  if (!values.password) errors.password = "Enter your password.";
  return errors;
}
export function validateSignup(values) {
  const errors = validateLogin(values);
  if (!values.name.trim()) errors.name = "Enter your full name.";
  if (values.phone && !/^\+?[\d\s-]{10,17}$/.test(values.phone.trim()))
    errors.phone = "Enter a valid mobile number.";
  if (values.password.length < 6)
    errors.password = "Use at least 6 characters.";
  if (values.password !== values.confirmPassword)
    errors.confirmPassword = "Passwords do not match.";
  if (!values.acceptedTerms)
    errors.acceptedTerms =
      "You must accept the Terms & Conditions to continue.";
  return errors;
}
export async function getProfile(role = "user") {
  const user = profile(
    unwrap(await (role === "admin" ? adminApi : userApi).get("/auth/profile")),
  );
  if (!validRole(user, role)) {
    clearSession(role);
    throw new Error(
      role === "admin"
        ? "Administrator access is required."
        : "Please use the administrator portal for this account.",
    );
  }
  updateSession(role, { user });
  return user;
}
async function establish(role, data, persistent) {
  saveSession(role, { ...tokens(data), user: profile(data.user) }, persistent);
  try {
    return await getProfile(role);
  } catch (error) {
    clearSession(role);
    throw error;
  }
}
async function login(role, values) {
  const data = unwrap(
    await publicApi.post("/auth/login", {
      email: values.email.trim(),
      password: values.password,
    }),
  );
  return establish(role, data, values.remember);
}
export const loginUser = (values) => login("user", values);
export const loginAdmin = (values) => login("admin", values);
export async function signupUser(values) {
  if (!values.acceptedTerms)
    throw new Error("You must accept the Terms & Conditions to continue.");
  const data = unwrap(
    await publicApi.post("/auth/register", {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim() || undefined,
      password: values.password,
    }),
  );
  if (data?.accessToken || data?.tokens?.accessToken)
    return establish("user", data, false);
  return loginUser(values);
}
export async function updateProfile(values, role = "user") {
  await (role === "admin" ? adminApi : userApi).put("/auth/profile", {
    name: values.name.trim(),
    phone: values.phone.trim(),
  });
  return getProfile(role);
}
export async function changePassword(values, role = "user") {
  return unwrap(
    await (role === "admin" ? adminApi : userApi).post(
      "/auth/change-password",
      { oldPassword: values.oldPassword, newPassword: values.newPassword },
    ),
  );
}
export const logoutUser = () => clearSession("user");
export const logoutAdmin = () => clearSession("admin");
export const getCurrentUser = () => readSession("user")?.user;
export const getCurrentAdmin = () => readSession("admin")?.user;
