// Isolated contract fixtures for browser QA ONLY. This is never imported by the app.
// Bind locally and point a separate Vite process here; production always uses the real API.
import http from "node:http";
import { Server as SocketIOServer } from "socket.io";
const stock = {
  id: "qa-stock",
  symbol: "QA-INSTRUMENT",
  token: "qa-token",
  exchange: "NSE",
  name: "QA contract fixture instrument",
  ltp: 109.87,
  changePercent: 1.2,
  open: 109.87,
  high: 114.69,
  low: 85.66,
  close: 111.26,
  isActive: true,
};
const user = {
  id: "qa-user",
  name: "QA Fixture User",
  email: "fixture@example.com",
  role: "user",
  isActive: true,
  isPremium: false,
  isTrialActive: true,
  canTrade: true,
  trialEndDate: new Date(Date.now() + 48 * 3600000).toISOString(),
  dummyBalance: 10000000,
  feeBalance: 401,
  totalTrades: 0,
  totalPnl: 0,
};
const admin = {
  ...user,
  id: "qa-admin",
  name: "QA Fixture Admin",
  role: "admin",
};
let stocks = [stock],
  watchlist = [],
  orders = [],
  entries = [],
  positions = [];
const list = (data, page = 1, limit = 20) => ({
  success: true,
  data: data.slice((page - 1) * limit, page * limit),
  pagination: {
    total: data.length,
    page,
    limit,
    pages: Math.ceil(data.length / limit),
  },
});
const success = (data) => ({ success: true, data });
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const path = url.pathname.replace(/^\/api/, "");
  let body = {};
  try {
    let text = "";
    for await (const chunk of req) text += chunk;
    if (text) body = JSON.parse(text);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, message: "Invalid JSON" }));
    return;
  }
  let status = 200,
    result;
  const session = req.headers.authorization?.includes("fixture-admin")
    ? "admin"
    : req.headers.authorization?.includes("fixture-user")
      ? "user"
      : null;
  const current = session === "admin" ? admin : user;
  if (path === "/auth/login" || path === "/auth/register") {
    const role = body.email === "admin.fixture@example.com" ? "admin" : "user";
    result = success({
      user: role === "admin" ? admin : user,
      tokens: {
        accessToken: `fixture-${role}`,
        refreshToken: `fixture-${role}-refresh`,
      },
    });
  } else if (path === "/auth/refresh")
    result = success({
      tokens: {
        accessToken: body.refreshToken?.includes("admin")
          ? "fixture-admin"
          : "fixture-user",
        refreshToken: body.refreshToken,
      },
    });
  else if (path.startsWith("/admin") && session !== "admin") {
    status = 403;
    result = { success: false, message: "Admin privileges required" };
  } else if (!session && !path.startsWith("/leaderboard")) {
    status = 401;
    result = { success: false, message: "Authentication token is required" };
  } else if (path === "/auth/profile") {
    if (req.method === "PUT") Object.assign(current, body);
    result = success(current);
  } else if (path === "/auth/change-password") result = success({});
  else if (path === "/stocks/search" || path === "/stocks")
    result = list(
      stocks,
      Number(url.searchParams.get("page") || 1),
      Number(url.searchParams.get("limit") || 20),
    );
  else if (path.endsWith("/historical"))
    result = success([
      ["2018-12-22T09:15:00+05:30", 75.16, 82.84, 36.16, 45.72],
      ["2018-12-23T09:15:00+05:30", 45.12, 53.9, 45.12, 48.09],
      ["2018-12-24T09:15:00+05:30", 60.71, 60.71, 53.39, 59.29],
      ["2018-12-25T09:15:00+05:30", 68.26, 68.26, 59.04, 60.5],
      ["2018-12-26T09:15:00+05:30", 67.71, 105.85, 66.67, 91.04],
      ["2018-12-27T09:15:00+05:30", 91.04, 121.4, 82.7, 111.4],
      ["2018-12-28T09:15:00+05:30", 111.51, 142.83, 109.87, 131.25],
      ["2018-12-29T09:15:00+05:30", 131.33, 151.17, 77.68, 96.43],
      ["2018-12-30T09:15:00+05:30", 106.33, 110.2, 90.39, 98.1],
      ["2018-12-31T09:15:00+05:30", 109.87, 114.69, 85.66, 111.26],
    ]); // OHLC example values from official Lightweight Charts documentation, QA only.
  else if (path.endsWith("/ltp"))
    result = success({
      ltp: stock.ltp,
      timestamp: "2018-12-31T09:16:00+05:30",
    });
  else if (path.startsWith("/stocks/")) result = success(stock);
  else if (path === "/watchlist/add") {
    watchlist = [stock];
    result = success({});
  } else if (path.startsWith("/watchlist/") && req.method === "DELETE") {
    watchlist = [];
    result = success({});
  } else if (path === "/watchlist")
    result = success({ stocks: watchlist, count: watchlist.length });
  else if (path === "/orders/buy" || path === "/orders/sell") {
    const order = {
      ...body,
      id: `qa-order-${orders.length + 1}`,
      symbol: stock.symbol,
      exchange: "NSE",
      price: body.limitPrice ?? stock.ltp,
      status: body.priceType === "LIMIT" ? "PENDING" : "EXECUTED",
      createdAt: new Date().toISOString(),
    };
    orders.unshift(order);
    if (body.orderType === "BUY")
      positions = [
        {
          id: "qa-position",
          stockId: stock.id,
          symbol: stock.symbol,
          exchange: "NSE",
          quantity: body.quantity,
          avgBuyPrice: stock.ltp,
          currentPrice: stock.ltp,
          investedAmount: body.quantity * stock.ltp,
          unrealizedPnl: 0,
        },
      ];
    else positions = [];
    result = success({ order });
  } else if (path === "/orders") result = list(orders);
  else if (path === "/orders/positions/open") result = success(positions);
  else if (path === "/orders/positions/closed") result = list([]);
  else if (path === "/orders/portfolio/summary")
    result = success({
      dummyBalance: user.dummyBalance,
      feeBalance: user.feeBalance,
      totalInvested: 0,
      totalCurrentValue: 0,
      totalPortfolioValue: 10000000,
      totalRealizedPnl: 0,
      totalUnrealizedPnl: 0,
      openPositionsCount: positions.length,
    });
  else if (path === "/orders/pnl/summary")
    result = success({
      realizedPnl: 0,
      unrealizedPnl: 0,
      totalPnl: 0,
      totalTrades: orders.length,
      winRate: 0,
    });
  else if (path.startsWith("/orders/"))
    result = success(orders.find((r) => r.id === path.split("/").at(-1)) ?? {});
  else if (path === "/payments/history") result = list([]);
  else if (path === "/leaderboard/stats")
    result = success({
      totalTraders: 1,
      totalPremiumTraders: 0,
      totalProfitGenerated: 0,
    });
  else if (path === "/leaderboard")
    result = success({
      leaderboard: [
        {
          rank: 1,
          name: user.name,
          userId: user.id,
          totalPnl: 0,
          totalTrades: orders.length,
          winRate: 0,
          type: "real",
        },
      ],
      total: 1,
    });
  else if (path.startsWith("/leaderboard/user/"))
    result = success({
      user,
      stats: { rank: 1, totalPnl: 0, totalTrades: orders.length, winRate: 0 },
      recentTrades: orders,
    });
  else if (path === "/admin/dashboard")
    result = success({
      users: { total: 1, premium: 0 },
      revenue: { totalRevenue: 0 },
      webSocketStatus: false,
      recentOrders: orders,
    });
  else if (path === "/admin/users") result = list([user]);
  else if (path.endsWith("/toggle-active")) {
    user.isActive = !user.isActive;
    result = success(user);
  } else if (path.endsWith("/trades")) result = list(orders);
  else if (path.endsWith("/pnl"))
    result = success({ realizedPnl: 0, unrealizedPnl: 0, totalPnl: 0 });
  else if (path.startsWith("/admin/users/")) result = success({ user });
  else if (
    path === "/admin/stocks/sync-prices" ||
    path === "/admin/angelone/session"
  )
    result = success({});
  else if (path === "/admin/angelone/instruments") {
    const providerInstruments = [
      {
        tradingsymbol: "QA-PROVIDER-EQ",
        symboltoken: "9999",
        exch_seg: "NSE",
        name: "QA Provider Instrument",
        instrumenttype: "EQ",
      },
      {
        tradingsymbol: "QA-PROVIDER-25SEP26-550FUT",
        symboltoken: "8888",
        exch_seg: "NFO",
        name: "QA Provider Futures Instrument",
        instrumenttype: "FUTSTK",
        expiry: "2026-09-25",
        lotsize: "550",
        strike: "-1",
      },
    ];
    const search = (url.searchParams.get("search") || "").toLowerCase();
    const exchange = url.searchParams.get("exchange");
    const instrumenttype = url.searchParams.get("instrumenttype");
    const filtered = providerInstruments.filter(
      (r) =>
        (!search ||
          r.tradingsymbol.toLowerCase().includes(search) ||
          r.name.toLowerCase().includes(search) ||
          r.symboltoken.includes(search)) &&
        (!exchange || r.exch_seg === exchange) &&
        (!instrumenttype || r.instrumenttype === instrumenttype),
    );
    result = list(
      filtered,
      Number(url.searchParams.get("page") || 1),
      Number(url.searchParams.get("limit") || 20),
    );
  }
  else if (path === "/admin/stocks" && req.method === "POST") {
    stocks.push({ ...body, id: `qa-added-${stocks.length}`, isActive: true });
    result = success(stocks.at(-1));
  } else if (path === "/admin/stocks") result = list(stocks);
  else if (path.startsWith("/admin/stocks/")) {
    const id = path.split("/")[3];
    if (path.endsWith("/toggle")) {
      const row = stocks.find((r) => r.id === id);
      if (row) row.isActive = !row.isActive;
    } else if (req.method === "DELETE")
      stocks = stocks.filter((r) => r.id !== id);
    else if (req.method === "PUT")
      Object.assign(stocks.find((r) => r.id === id) ?? {}, body);
    result = success({});
  } else if (path === "/admin/leaderboard" && req.method === "POST") {
    entries.push({
      ...body,
      id: `qa-entry-${entries.length}`,
      isVisible: true,
    });
    result = success(entries.at(-1));
  } else if (path === "/admin/leaderboard") result = success(entries);
  else if (path.startsWith("/admin/leaderboard/")) {
    const id = path.split("/").at(-1);
    if (req.method === "DELETE") entries = entries.filter((r) => r.id !== id);
    else Object.assign(entries.find((r) => r.id === id) ?? {}, body);
    result = success({});
  } else {
    status = 404;
    result = { success: false, message: "Not present in QA fixture server" };
  }
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result));
});
// Deterministic Socket.IO fixture matching the documented contract
// (subscribe:stocks / unsubscribe:stocks -> price:update). Echoes back the
// SAME static fixture LTP already used above — never randomized — purely to
// prove the subscribe -> event -> UI wiring, not to simulate market movement.
const socketPrices = {
  [stock.token]: {
    ltp: stock.ltp,
    change: 1.32,
    changePercent: stock.changePercent,
    high: stock.high,
    low: stock.low,
    open: stock.open,
    close: stock.close,
  },
  "9999": {
    ltp: 250.5,
    change: -2.1,
    changePercent: -0.83,
    high: 255,
    low: 248,
    open: 253,
    close: 252.6,
  },
};
const io = new SocketIOServer(server, { cors: { origin: "*" } });
io.on("connection", (socket) => {
  socket.on("subscribe:stocks", (tokens = []) => {
    for (const token of tokens) {
      const price = socketPrices[token];
      if (!price) continue;
      socket.emit("price:update", { token, ...price });
    }
  });
});
server.listen(3900, "127.0.0.1", () =>
  console.log(
    "Isolated QA fixture API + Socket.IO on http://127.0.0.1:3900/api",
  ),
);
