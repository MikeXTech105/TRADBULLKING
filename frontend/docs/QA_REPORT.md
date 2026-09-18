# Browser and integration QA — 18 September 2026

## Scope and result

The frontend uses the real Render API. Populated UI testing used a separate local contract-fixture process on port 3900 and a separate Vite QA mode on port 3002; fixtures are never connected to the production app. Real preview runs on localhost:3000.

13 automated service/auth tests pass. Production build passes. User and admin modules use lazy route imports and framework vendor chunks.

## Responsive checks

Browser layout checks covered login, signup, watchlist, stock search, trade/chart, orders, positions, portfolio, leaderboard, membership, profile, admin login/dashboard/users/stocks at all of:

| Viewport | Page horizontal overflow |
| --- | --- |
| 375 × 812 | None |
| 390 × 844 | None |
| 414 × 896 | None |
| 768 × 1024 | None |
| 1440 × 900 | None |

Additional edge checks at widths 320, 360, 430 and 1024 covered signup, market, trade, orders, leaderboard, membership, profile, admin users and stocks: no page horizontal overflow. Width measurements account for desktop browser scrollbar space.

Visual review included phone login/signup, populated watchlist/search, chart, full-screen BUY/SELL forms, orders/positions, compact portfolio, leaderboard, membership/account, admin login/dashboard/drawer/users/user detail/stocks/add/edit dialogs and desktop/tablet stock administration. Chart container resized across viewport changes. Timeframe scrolling is intentional; there is no page overflow. Mobile content reserves space for bottom navigation and trading actions; order entry fills the screen and scrolls separately. Safe-area and dynamic viewport CSS are included.

Numeric keyboard hints are configured. Real iOS/Android software-keyboard and physical-device safe-area behavior have not been device-tested in this desktop browser; focus/scroll layout was inspected. No claim of physical-device testing is made.

## Interactions checked

- Live QA registration, login, profile, refresh and available read-only user endpoints; invalid login and user credentials denied on admin endpoints.
- Fixture market/watchlist, instrument details, validated historical chart and LTP display.
- Fixture BUY MARKET, BUY LIMIT (PENDING), SELL MARKET; invalid quantity validation; order details; open positions; closed-position empty state; portfolio and backend P&L.
- Fixture administrator login, dashboard, drawer navigation, users/detail/trades/P&L, deactivate/reactivate, stock create/edit/toggle/delete, sync action and synthetic leaderboard create/edit/delete.
- Scoped session persistence, authorization, refresh queue/failure, delayed 401 and logout race behavior covered by automated tests.
- Cashfree create/verify/get/history request routes covered by contract tests. No provider payment or real charge was completed.

## Live constraints

Live stocks/search and leaderboard were empty. Newly registered QA trial was active, with zero dummy/fee balances. Live LTP/history/order execution therefore could not be proven. Admin credentials and the referenced Postman collection were unavailable. Provider mode/account configuration and a completed Cashfree sandbox transaction still require operator verification. See API_CONTRACT.md for exact response differences and unsupported backend capabilities.

Production build login was smoke-tested in a fresh browser tab with no console warnings/errors. Browser checks also confirmed that admin logout preserves the user login, and that both protected areas redirect correctly after their own logout.
