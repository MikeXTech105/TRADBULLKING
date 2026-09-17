import axios from "axios";
// Future backend client. Mock authentication does not make network requests.
export default axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});
