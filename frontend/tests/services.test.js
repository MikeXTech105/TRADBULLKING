import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import {
  createRoleClient,
  publicApi,
  userApi,
  adminApi,
  errorMessage,
} from "../src/services/api.js";
import {
  saveSession,
  readSession,
  clearSession,
  validRole,
  updateSession,
} from "../src/services/session.js";
import {
  unwrap,
  collection,
  candles,
  tokens,
} from "../src/services/adapters.js";
import {
  loginUser,
  loginAdmin,
  signupUser,
  getProfile,
  validateSignup,
} from "../src/services/authService.js";
import { orderPayload, orderService } from "../src/services/orderService.js";
import { stockService, intervals } from "../src/services/stockService.js";
import { watchlistService } from "../src/services/watchlistService.js";
import { paymentService } from "../src/services/paymentService.js";
import { adminService } from "../src/services/adminService.js";
import { formatINR, formatPercent, formatPnl } from "../src/utils/format.js";
const defaults = [publicApi, userApi, adminApi].map(
  (client) => client.defaults.adapter,
);
const storage = () => {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
    map,
  };
};
const response = (config, data, status = 200) => ({
  config,
  data,
  status,
  statusText: String(status),
  headers: {},
});
const reject = (config, status, message = "Rejected") =>
  Promise.reject(
    new axios.AxiosError(
      message,
      "ERR_BAD_REQUEST",
      config,
      null,
      response(config, { success: false, message }, status),
    ),
  );
const tokenPair = {
  accessToken: "fixture-access",
  refreshToken: "fixture-refresh",
};
const user = {
  id: "fixture-user",
  name: "QA User",
  role: "user",
  isActive: true,
};
beforeEach(() => {
  globalThis.localStorage = storage();
  globalThis.sessionStorage = storage();
});
afterEach(() => {
  [publicApi, userApi, adminApi].forEach(
    (client, i) => (client.defaults.adapter = defaults[i]),
  );
});
test("separate role storage, remember persistence, and backend role validation", () => {
  saveSession("user", { ...tokenPair, user }, true);
  saveSession(
    "admin",
    { ...tokenPair, user: { ...user, role: "admin" } },
    false,
  );
  assert.ok(localStorage.getItem("tbk_user_session"));
  assert.ok(sessionStorage.getItem("tbk_admin_session"));
  assert.equal(validRole({ role: "user" }, "admin"), false);
  assert.equal(validRole({ role: "admin", isActive: false }, "admin"), false);
  clearSession("user");
  assert.equal(readSession("user"), null);
  assert.equal(readSession("admin").user.role, "admin");
});
test("concurrent unauthorized requests share a refresh and retry exactly once", async () => {
  saveSession("user", { ...tokenPair, user });
  const client = createRoleClient("user");
  let refreshes = 0,
    requests = 0;
  publicApi.defaults.adapter = async (config) => {
    refreshes++;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return response(config, {
      success: true,
      data: {
        tokens: { accessToken: "fresh-access", refreshToken: "fresh-refresh" },
      },
    });
  };
  client.defaults.adapter = (config) => {
    requests++;
    return config.headers.Authorization === "Bearer fresh-access"
      ? Promise.resolve(response(config, { ok: true }))
      : reject(config, 401);
  };
  await Promise.all([client.get("/first"), client.get("/second")]);
  assert.equal(refreshes, 1);
  assert.equal(requests, 4);
  assert.equal(readSession("user").accessToken, "fresh-access");
});
test("refresh failure clears only the affected role without infinite retry", async () => {
  saveSession("user", { ...tokenPair, user });
  saveSession("admin", { ...tokenPair, user: { ...user, role: "admin" } });
  const client = createRoleClient("user");
  let refreshes = 0;
  publicApi.defaults.adapter = (config) => {
    refreshes++;
    return reject(config, 401);
  };
  client.defaults.adapter = (config) => reject(config, 401);
  await assert.rejects(client.get("/profile"));
  assert.equal(refreshes, 1);
  assert.equal(readSession("user"), null);
  assert.ok(readSession("admin"));
});
test("401 after successful refresh ends the session after one retry", async () => {
  saveSession("user", { ...tokenPair, user });
  const client = createRoleClient("user");
  let refreshes = 0,
    requests = 0;
  publicApi.defaults.adapter = (config) => {
    refreshes++;
    return Promise.resolve(
      response(config, {
        data: { tokens: { accessToken: "new", refreshToken: "new-refresh" } },
      }),
    );
  };
  client.defaults.adapter = (config) => {
    requests++;
    return reject(config, 401);
  };
  await assert.rejects(client.get("/private"));
  assert.equal(refreshes, 1);
  assert.equal(requests, 2);
  assert.equal(readSession("user"), null);
});
test("logout during refresh cannot resurrect a session", async () => {
  saveSession("user", { ...tokenPair, user });
  const client = createRoleClient("user");
  let release;
  publicApi.defaults.adapter = (config) =>
    new Promise((resolve) => {
      release = () =>
        resolve(
          response(config, {
            data: {
              tokens: { accessToken: "new", refreshToken: "new-refresh" },
            },
          }),
        );
    });
  client.defaults.adapter = (config) => reject(config, 401);
  const pending = client.get("/profile");
  while (!release) await new Promise((resolve) => setTimeout(resolve, 1));
  clearSession("user");
  release();
  await assert.rejects(pending);
  assert.equal(readSession("user"), null);
});
test("a delayed unauthorized response uses the already refreshed token", async () => {
  saveSession("user", { ...tokenPair, user });
  const client = createRoleClient("user");
  let refreshes = 0;
  publicApi.defaults.adapter = (config) => {
    refreshes++;
    return Promise.resolve(
      response(config, {
        data: { tokens: { accessToken: "new", refreshToken: "new-refresh" } },
      }),
    );
  };
  client.defaults.adapter = async (config) => {
    if (config.headers.Authorization === "Bearer new")
      return response(config, {});
    if (config.url === "/delayed")
      await new Promise((resolve) => setTimeout(resolve, 30));
    return reject(config, 401);
  };
  await Promise.all([client.get("/first"), client.get("/delayed")]);
  assert.equal(refreshes, 1);
});
test("backend profile rejects a forged admin flag and preserves the user login", async () => {
  saveSession("user", { ...tokenPair, user });
  saveSession("admin", { ...tokenPair, user: { ...user, role: "admin" } });
  adminApi.defaults.adapter = (config) =>
    Promise.resolve(response(config, { success: true, data: user }));
  await assert.rejects(getProfile("admin"), /Administrator/);
  assert.equal(readSession("admin"), null);
  assert.ok(readSession("user"));
});
test("real login/register payloads and profile verification do not persist passwords", async () => {
  const payloads = [];
  publicApi.defaults.adapter = (config) => {
    payloads.push([config.url, JSON.parse(config.data)]);
    return Promise.resolve(
      response(config, { success: true, data: { user, tokens: tokenPair } }),
    );
  };
  userApi.defaults.adapter = (config) =>
    Promise.resolve(response(config, { success: true, data: user }));
  await signupUser({
    name: " QA User ",
    email: "qa@example.com",
    phone: "",
    password: "test-password",
    confirmPassword: "test-password",
  });
  assert.deepEqual(payloads[0], [
    "/auth/register",
    { name: "QA User", email: "qa@example.com", password: "test-password" },
  ]);
  assert.ok(readSession("user"));
  assert.ok(!JSON.stringify([...sessionStorage.map]).includes("test-password"));
  await loginUser({
    email: " qa@example.com ",
    password: "test-password",
    remember: true,
  });
  assert.ok(localStorage.getItem("tbk_user_session"));
  adminApi.defaults.adapter = (config) =>
    Promise.resolve(response(config, { success: true, data: user }));
  await assert.rejects(
    loginAdmin({ email: "qa@example.com", password: "test-password" }),
  );
  assert.ok(readSession("user"));
  assert.ok(
    validateSignup({
      name: "",
      email: "x",
      phone: "x",
      password: "x",
      confirmPassword: "y",
    }).name,
  );
});
test("live list envelopes preserve outer pagination and stocks in watchlist", () => {
  const data = collection(
    unwrap({
      data: {
        success: true,
        data: [{ _id: "stock-1", symbol: "TEST" }],
        pagination: { total: 41, page: 2, pages: 3 },
      },
    }),
    "stocks",
  );
  assert.equal(data.total, 41);
  assert.equal(data.page, 2);
  assert.equal(data.totalPages, 3);
  assert.equal(data.rows[0].id, "stock-1");
  assert.deepEqual(collection({ stocks: [] }, "stocks").rows, []);
  assert.throws(() => collection({ wrong: [] }, "stocks"), /unsupported/);
  assert.throws(() => tokens({ accessToken: "only" }), /refresh/);
});
test("historical candle normalization sorts, deduplicates, and rejects malformed data", () => {
  const result = candles([
    ["2026-09-17T09:20:00+05:30", 101, 104, 100, 103],
    ["2026-09-17T09:15:00+05:30", 100, 103, 99, 101],
    ["2026-09-17T09:20:00+05:30", 101, 105, 100, 104],
  ]);
  assert.equal(result.length, 2);
  assert.ok(result[0].time < result[1].time);
  assert.equal(result[1].close, 104);
  assert.deepEqual(candles([]), []);
  assert.throws(() => candles([["bad", 1, 2, 0, 1]]), /valid OHLC/);
  assert.equal(intervals.length, 7);
});
test("orders validate positive integers and supported sides without inventing margin fields", () => {
  assert.deepEqual(
    orderPayload({
      stockId: "stock-1",
      side: "BUY",
      quantity: "2",
      priceType: "LIMIT",
      limitPrice: "123.4",
    }),
    {
      stockId: "stock-1",
      orderType: "BUY",
      quantity: 2,
      priceType: "LIMIT",
      limitPrice: 123.4,
    },
  );
  for (const quantity of [0, -1, 1.5, "abc"])
    assert.throws(() =>
      orderPayload({
        stockId: "s",
        side: "BUY",
        quantity,
        priceType: "MARKET",
      }),
    );
  assert.throws(() =>
    orderPayload({
      stockId: "s",
      side: "SELL",
      quantity: 1,
      priceType: "LIMIT",
      limitPrice: 1,
    }),
  );
});
test("service integration routes and request bodies match the published contract", async () => {
  saveSession("user", { ...tokenPair, user });
  saveSession("admin", { ...tokenPair, user: { ...user, role: "admin" } });
  const calls = [];
  const adapter = (config) => {
    calls.push({
      method: config.method,
      url: config.url,
      body: config.data ? JSON.parse(config.data) : undefined,
      params: config.params,
      auth: config.headers.Authorization,
    });
    const data =
      config.url === "/watchlist"
        ? { stocks: [] }
        : config.method === "get" &&
            (config.url.includes("/users") ||
              config.url === "/stocks" ||
              config.url.includes("/history") ||
              config.url.includes("/positions") ||
              config.url === "/orders" ||
              config.url === "/admin/stocks")
          ? []
          : config.url === "/admin/leaderboard"
            ? []
            : {};
    return Promise.resolve(
      response(config, {
        success: true,
        data,
        pagination: Array.isArray(data)
          ? { total: 0, page: 1, pages: 0 }
          : undefined,
      }),
    );
  };
  userApi.defaults.adapter = adapter;
  adminApi.defaults.adapter = adapter;
  await stockService.list({ page: 1 });
  await watchlistService.list();
  await watchlistService.add("s");
  await watchlistService.remove("s");
  await watchlistService.clear();
  await orderService.place({
    stockId: "s",
    side: "BUY",
    quantity: 1,
    priceType: "MARKET",
  });
  await orderService.place({
    stockId: "s",
    side: "SELL",
    quantity: 1,
    priceType: "MARKET",
  });
  await orderService.open();
  await orderService.closed({ page: 1 });
  await orderService.portfolio();
  await orderService.pnl();
  await paymentService.create();
  await paymentService.verify("order-1");
  await paymentService.get("order-1");
  await paymentService.history({ page: 1 });
  await adminService.dashboard();
  await adminService.users({ search: "qa", filter: "premium" });
  await adminService.toggleUser("u");
  await adminService.addStock({
    symbol: "TEST",
    token: "1",
    exchange: "NSE",
    name: "Test",
  });
  await adminService.editStock("s", { name: "Edited" });
  await adminService.toggleStock("s");
  await adminService.deleteStock("s");
  await adminService.sync();
  await adminService.angelSession({ totp: "000000" });
  await adminService.leaderboard();
  await adminService.addEntry({ name: "Synthetic", totalPnl: 1 });
  await adminService.editEntry("e", { name: "Updated", isVisible: false });
  await adminService.deleteEntry("e");
  assert.ok(
    calls.some((c) => c.url === "/orders/buy" && c.body.orderType === "BUY"),
  );
  assert.ok(
    calls.some((c) => c.url === "/orders/sell" && c.body.orderType === "SELL"),
  );
  assert.ok(
    calls.some(
      (c) => c.url === "/payments/verify/order-1" && c.method === "post",
    ),
  );
  assert.ok(
    calls.some(
      (c) => c.url === "/admin/users/u/toggle-active" && c.method === "put",
    ),
  );
  assert.ok(calls.every((c) => c.auth === "Bearer fixture-access"));
});
test("Indian formatting and meaningful network/HTTP errors", () => {
  assert.equal(formatINR(50000000, 0), "₹5,00,00,000");
  assert.equal(formatINR(undefined), "—");
  assert.equal(formatPercent(12.54), "+12.54%");
  assert.equal(formatPnl(-8120), "-₹8,120.00");
  assert.ok(errorMessage({ code: "ECONNABORTED" }).includes("longer"));
  assert.equal(
    errorMessage({
      response: { status: 403, data: { message: "Trial ended" } },
    }),
    "Trial ended",
  );
});
