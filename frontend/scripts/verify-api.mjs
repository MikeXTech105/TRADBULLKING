import fs from "node:fs/promises";
const base =
  process.env.VITE_API_BASE_URL || "https://tradbullking.onrender.com/api";
const email = process.env.TBK_QA_EMAIL;
const password = process.env.TBK_QA_PASSWORD;
if (!email || !password)
  throw new Error(
    "Set TBK_QA_EMAIL and TBK_QA_PASSWORD for the designated QA account.",
  );
const results = {};
function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key,
        /token|password|totp|sessionid/i.test(key) ? "[REDACTED]" : redact(val),
      ]),
    );
  return value;
}
let accessToken;
async function request(path, method = "GET", body, authenticated = true) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(authenticated && accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  results[`${method} ${path}`] = {
    status: response.status,
    body: redact(data),
  };
  console.log(`${method} ${path}: ${response.status}`);
  return data;
}
if (process.argv.includes("--register"))
  await request(
    "/auth/register",
    "POST",
    { name: "Frontend QA", email, password },
    false,
  );
const login = await request("/auth/login", "POST", { email, password }, false);
const auth = login.data?.tokens ?? login.data;
accessToken = auth?.accessToken;
if (accessToken) {
  for (const path of [
    "/auth/profile",
    "/stocks?limit=5",
    "/stocks/search?q=RELIANCE",
    "/watchlist",
    "/orders?limit=5",
    "/orders/positions/open",
    "/orders/positions/closed",
    "/orders/portfolio/summary",
    "/orders/pnl/summary",
    "/payments/history",
    "/admin/dashboard",
  ])
    await request(path);
  const refreshed = await request(
    "/auth/refresh",
    "POST",
    { refreshToken: auth.refreshToken },
    false,
  );
  const fresh = refreshed.data?.tokens ?? refreshed.data;
  if (fresh?.accessToken) {
    accessToken = fresh.accessToken;
    await request("/auth/profile");
  }
}
await request("/leaderboard");
await request("/leaderboard/stats");
await fs.mkdir("docs", { recursive: true });
await fs.writeFile(
  "docs/live-responses.json",
  JSON.stringify(results, null, 2),
);
