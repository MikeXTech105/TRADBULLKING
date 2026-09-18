import axios from "axios";
import {
  readSession,
  updateSession,
  clearSession,
  sessionRevision,
} from "./session.js";
import { tokens, unwrap } from "./adapters.js";
const baseURL = import.meta.env?.DEV
  ? "/api"
  : import.meta.env?.VITE_API_BASE_URL ||
    "https://tradbullking.onrender.com/api";
const options = {
  baseURL,
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
};
export const publicApi = axios.create(options);
export function createRoleClient(role) {
  const client = axios.create(options);
  let refreshing = null;
  client.interceptors.request.use((config) => {
    const session = readSession(role);
    config._userId ??= session?.user?.id;
    if (session?.accessToken)
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    return config;
  });
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config;
      if (error.response?.status !== 401 || !config)
        return Promise.reject(error);
      if (config._retried) {
        clearSession(role);
        return Promise.reject(error);
      }
      const session = readSession(role);
      if (config._userId && config._userId !== session?.user?.id)
        return Promise.reject(
          new Error("Your account changed. Please submit the request again."),
        );
      if (!session?.refreshToken) {
        clearSession(role);
        return Promise.reject(error);
      }
      config._retried = true;
      if (config.headers.Authorization !== `Bearer ${session.accessToken}`)
        return client(config);
      if (!refreshing) {
        const revision = sessionRevision(role);
        refreshing = publicApi
          .post("/auth/refresh", { refreshToken: session.refreshToken })
          .then((response) => {
            if (sessionRevision(role) !== revision)
              throw new Error("Your session changed. Sign in again.");
            updateSession(role, tokens(unwrap(response)));
          })
          .catch((err) => {
            if (sessionRevision(role) === revision) clearSession(role);
            throw err;
          })
          .finally(() => {
            refreshing = null;
          });
      }
      try {
        await refreshing;
        return await client(config);
      } catch (err) {
        return Promise.reject(err);
      }
    },
  );
  return client;
}
export const userApi = createRoleClient("user");
export const adminApi = createRoleClient("admin");
export default userApi;
export function errorMessage(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.code === "ECONNABORTED")
    return "The server is taking longer than expected. Please retry in a moment.";
  if (error.code === "ERR_NETWORK")
    return "Unable to connect to TRADBULLKING servers. Check your connection and retry.";
  const status = error.response?.status;
  const messages = {
    400: "Check your request and try again.",
    401: "Your session has ended. Please sign in again.",
    403: "You do not have access to this action.",
    404: "This record could not be found.",
    409: "This record already exists or has changed.",
    422: "Please check the information you entered.",
    429: "Too many requests. Please wait before trying again.",
  };
  return (
    messages[status] ||
    (status >= 500
      ? "The server is temporarily unavailable. Please retry."
      : error.message || "Something went wrong. Please retry.")
  );
}
