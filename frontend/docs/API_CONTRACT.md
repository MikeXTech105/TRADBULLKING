# API contract mapping

Source: https://tradbullking.onrender.com/api-docs/ (retrieved 2026-09-17). Postman collection was not supplied or found.

The saved OpenAPI document contains every request schema, query parameter, response description, and error declaration. The table below is the integration index.

| Method | Endpoint | Role/auth | Query | Body fields | Responses |
|---|---|---|---|---|---|
| GET | /watchlist | User bearer |  |  | 200: Watchlist with live stock prices |
| POST | /watchlist/add | User bearer |  | stockId* | 201: Stock added to watchlist; 404: Stock not found; 409: Stock already in watchlist |
| DELETE | /watchlist/clear | User bearer |  |  | 200: Watchlist cleared |
| DELETE | /watchlist/{stockId} | User bearer |  |  | 200: Stock removed from watchlist; 404: Stock not found in watchlist |
| GET | /stocks | User bearer | page, limit, exchange, search |  | 200: Paginated list of active stocks |
| GET | /stocks/search | User bearer | q, exchange |  | 200: Search results (up to 20 stocks) |
| POST | /stocks/search-angelone | User bearer |  | exchange*, searchscrip* | 200: AngelOne search results; 503: AngelOne session not available |
| GET | /stocks/symbol/{symbol} | User bearer |  |  | 200: Stock details; 404: Stock not found |
| GET | /stocks/{id} | User bearer |  |  | 200: Stock details; 404: Stock not found |
| GET | /stocks/{id}/ltp | User bearer | fresh |  | 200: Live price data |
| GET | /stocks/{id}/historical | User bearer | interval, fromdate, todate |  | 200: Historical candle data; 503: AngelOne session not available |
| POST | /payments/webhook | Public |  |  | 200: Webhook processed; 400: Invalid signature |
| POST | /payments/create | User bearer |  |  | 201: Payment order created with session ID |
| POST | /payments/verify/{orderId} | User bearer |  |  | 200: Payment verified - premium activated with ₹5 crore balance; 404: Payment record not found |
| GET | /payments/history | User bearer | page, limit |  | 200: Payment history |
| GET | /payments/{orderId} | User bearer |  |  | 200: Payment details; 404: Payment not found |
| GET | /orders/portfolio/summary | User bearer |  |  | 200: Portfolio summary |
| GET | /orders/pnl/summary | User bearer |  |  | 200: P&L breakdown with win rate, max profit/loss |
| GET | /orders/positions/open | User bearer |  |  | 200: Open positions with live prices |
| GET | /orders/positions/closed | User bearer | page, limit |  | 200: Paginated closed positions |
| POST | /orders/buy | User bearer |  | stockId*, quantity*, priceType, limitPrice | 201: Buy order executed; 400: Insufficient balance or invalid request; 403: Cannot trade - trial expired or fee balance empty |
| POST | /orders/sell | User bearer |  | stockId*, quantity*, priceType, limitPrice | 201: Sell order executed with realized P&L; 400: Insufficient position quantity; 403: Cannot trade |
| GET | /orders | User bearer | page, limit, orderType, status, symbol |  | 200: Paginated order history |
| GET | /orders/{id} | User bearer |  |  | 200: Order details; 404: Order not found |
| GET | /leaderboard | Public | limit |  | 200: Ranked leaderboard with P&L, win rate, and trade stats |
| GET | /leaderboard/stats | Public |  |  | 200: Leaderboard statistics |
| GET | /leaderboard/user/{userId} | Public |  |  | 200: User public profile with 50 most recent executed trades; 404: User not found |
| POST | /auth/register | Public |  | name*, email*, password*, phone | 201: Registration successful with 48-hour free trial; 409: Email already registered; 422: Validation error |
| POST | /auth/login | Public |  | email*, password* | 200: Login successful; 401: Invalid credentials |
| POST | /auth/refresh | Public |  | refreshToken* | 200: New tokens issued; 401: Invalid or expired refresh token |
| GET | /auth/profile | User bearer |  |  | 200: Profile data; 401: Unauthorized |
| PUT | /auth/profile | User bearer |  | name, phone | 200: Profile updated |
| POST | /auth/change-password | User bearer |  | oldPassword*, newPassword* | 200: Password changed successfully; 400: Incorrect current password |
| GET | /admin/dashboard | Admin bearer |  |  | 200: Dashboard stats including users, orders, revenue; 403: Admin access required |
| GET | /admin/users | Admin bearer | page, limit, search, filter |  | 200: Paginated list of users |
| GET | /admin/users/{id} | Admin bearer |  |  | 200: User details and stats; 404: User not found |
| GET | /admin/users/{id}/trades | Admin bearer | page, limit |  | 200: User's trade history |
| GET | /admin/users/{id}/pnl | Admin bearer |  |  | 200: User's P&L breakdown |
| PUT | /admin/users/{id}/toggle-active | Admin bearer |  |  | 200: User status toggled |
| GET | /admin/stocks | Admin bearer | page, limit, search, exchange |  | 200: Paginated list of all stocks |
| POST | /admin/stocks | Admin bearer |  | symbol*, token*, exchange*, name*, exchangeType | 201: Stock added successfully; 409: Stock with this token already exists |
| PUT | /admin/stocks/{id} | Admin bearer |  | name, high52, low52 | 200: Stock updated |
| DELETE | /admin/stocks/{id} | Admin bearer |  |  | 200: Stock deleted; 400: Cannot delete stock with open positions |
| PUT | /admin/stocks/{id}/toggle | Admin bearer |  |  | 200: Stock status toggled |
| POST | /admin/stocks/sync-prices | Admin bearer |  |  | 200: Prices synced; 503: AngelOne session not available |
| POST | /admin/angelone/session | Admin bearer |  | clientId, password, totp* | 200: Session initialized, WebSocket connected |
| GET | /admin/angelone/instruments | Admin bearer | search, exchange, instrumenttype, page, limit |  | 200: Paginated list of AngelOne instruments; 503: Failed to fetch instruments |
| GET | /admin/leaderboard | Admin bearer |  |  | 200: All dummy entries |
| POST | /admin/leaderboard | Admin bearer |  | name*, profilePic, totalPnl*, totalTrades, winRate, winAmount, lossAmount | 201: Dummy entry added |
| PUT | /admin/leaderboard/{id} | Admin bearer |  | name, totalPnl, isVisible | 200: Entry updated |
| DELETE | /admin/leaderboard/{id} | Admin bearer |  |  | 200: Entry deleted |

* marks a required request field. Path parameters use the identifiers returned by the backend.

## Observed contract gaps and differences

- Live list responses put arrays in data and pagination beside data, with pagination.pages. Adapters preserve this outer pagination.
- Watchlist returns data.stocks, not a data.watchlist array.
- Portfolio returns totalRealizedPnl, totalUnrealizedPnl, totalInvested, totalCurrentValue, totalPortfolioValue, and openPositionsCount. The UI uses these live keys.
- Login/register/refresh return data.tokens. Profile returns data directly.
- Buy/sell request schemas require orderType but omit its property definition. The Order schema defines BUY/SELL, and requests send the corresponding side. Successful execution still needs verification against a populated account.
- Swagger permits LIMIT in the sell schema; this build conservatively exposes SELL MARKET per the requested supported flow, pending actual behavior verification.
- Stock creation accepts symbol, token, exchange, name, exchangeType. high52/low52 are documented only for editing. The forms honor this distinction.
- Synthetic entry editing documents name, totalPnl, isVisible only; other entry fields are offered at creation only.
- No admin-wide orders endpoint or arbitrary system-settings endpoint is documented. /admin/orders directs administrators to per-user trading history; /admin/settings uses account and AngelOne session APIs.
- No client-facing WebSocket URL, authentication handshake, subscription message, or quote event schema is published. The backend AngelOne WebSocket is not a browser socket contract. A shared polling manager is used.
- CORS preflight allows http://localhost:3000 even when Origin is http://localhost:5173. Development uses port 3000 and a same-origin Vite proxy. Production requires an allowed frontend origin or an operator-managed same-origin API proxy.
- New QA registration returned a valid 48-hour trial and canTrade=true, but dummyBalance=0 and feeBalance=0. No trial funding is assumed in the frontend.
- Live stocks and stock search returned empty arrays. No historical/LTP or successful orders can be live-tested until administrators add instruments and initialize market data.
- Public leaderboard was empty. Real leaderboard ranks and profiles remain dependent on actual trading records.
- No admin credentials or Postman collection were provided. Admin mutations are covered with controlled contract fixtures, not claimed as live-verified.
- Cashfree mode must match the backend environment. No real payment was completed by this implementation session.

Direct API configuration (18 September 2026): the development proxy has been removed. Axios uses VITE_API_BASE_URL for both development and production. A live OPTIONS request to http://91.108.110.56/api/auth/login with Origin http://localhost:3000 returned 204 but Access-Control-Allow-Origin https://tradbullking-1.onrender.com. The backend must allow and return the matching localhost origin for direct browser requests to work. This cannot be corrected with frontend response headers. Authentication/rate-limit responses remain separate backend concerns.
