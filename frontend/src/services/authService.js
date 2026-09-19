import { publicApi, userApi, adminApi, errorMessage } from "./api.js";
import { profile, tokens, unwrap } from "./adapters.js";
import { normalizeUserName } from "../utils/identity.js";
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
  const userName = normalizeUserName(values.userName);
  if (!userName) errors.userName = "Username is required.";
  else if (userName.length < 3)
    errors.userName = "Username must be at least 3 characters.";
  else if (userName.length > 30)
    errors.userName = "Username must be 30 characters or fewer.";
  else if (!/^[a-z0-9_]+$/.test(userName))
    errors.userName = "Use only lowercase letters, numbers, and underscores.";
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

const signupField = (value) => {
  const field = String(value ?? "").toLowerCase();
  if (field.includes("username") || field.includes("user_name")) return "userName";
  if (field.includes("email")) return "email";
  if (field.includes("password")) return "password";
  if (field.includes("phone")) return "phone";
  if (field === "name" || field.includes("full name")) return "name";
  if (field.includes("referral")) return "referralCode";
  return "";
};

export function signupFailure(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const serverText = [data?.message, data?.error, data?.data?.message]
    .filter((value) => typeof value === "string")
    .join(" ");
  const lower = serverText.toLowerCase();
  const fieldErrors = {};
  const issues = Array.isArray(data?.errors)
    ? data.errors
    : Array.isArray(data?.data?.errors)
      ? data.data.errors
      : [];

  for (const issue of issues) {
    const key = signupField(
      issue?.field ?? issue?.param ?? issue?.property ?? issue?.path?.join?.("."),
    );
    const message = issue?.message ?? issue?.msg ?? issue?.error;
    if (key && typeof message === "string" && message.trim())
      fieldErrors[key] = message.trim();
  }

  if (status === 409) {
    if (fieldErrors.userName && !fieldErrors.email) {
      fieldErrors.userName =
        "Username is already taken. Please choose another username.";
      return { fieldErrors, focus: "userName", message: fieldErrors.userName };
    }
    if (fieldErrors.email && !fieldErrors.userName) {
      fieldErrors.email = "An account with this email already exists.";
      return { fieldErrors, focus: "email", message: fieldErrors.email };
    }
    const mentionsUserName = /user\s*name/.test(lower);
    const mentionsEmail = /email/.test(lower);
    if (mentionsUserName && !mentionsEmail) {
      fieldErrors.userName = "Username is already taken. Please choose another username.";
      return { fieldErrors, focus: "userName", message: fieldErrors.userName };
    }
    if (mentionsEmail && !mentionsUserName) {
      fieldErrors.email = "An account with this email already exists.";
      return { fieldErrors, focus: "email", message: fieldErrors.email };
    }
    const message =
      "Email or username is already in use. Please try a different username or email.";
    fieldErrors.userName = message;
    fieldErrors.email = message;
    return { fieldErrors, focus: "userName", message };
  }

  if (status === 422) {
    if (!Object.keys(fieldErrors).length) {
      const key = signupField(serverText);
      if (key) fieldErrors[key] = serverText || "Please check this field.";
    }
    return {
      fieldErrors,
      focus: Object.keys(fieldErrors)[0],
      message: errorMessage(error, "Please check your registration details."),
    };
  }

  return {
    fieldErrors,
    focus: Object.keys(fieldErrors)[0],
    message: errorMessage(error, "Unable to create account."),
  };
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
      userName: normalizeUserName(values.userName),
      email: values.email.trim(),
      phone: values.phone.trim() || undefined,
      password: values.password,
      referralCode: values.referralCode?.trim() || undefined,
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
