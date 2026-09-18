# Light workspace redesign QA — 18 September 2026

## Scope and shared design

Refactored both application shells around `WorkspaceSidebar` and `WorkspaceHeader`, with functional menu search, breadcrumbs, profile menus, scoped logout and a mobile admin drawer. Central `designTokens.js` supplies the MUI light theme and CSS variables. Replaced the previous layered styles with one consolidated `index.css`; removed the separate mobile stylesheet and unused decorative auth/dashboard markup.

Shared PageHeader, StatCards, StatusBadge, DataTable, RowActions, Pagination, ConfirmDialog and QueryState now provide compact headings, white metric cards with tinted icons/top accents, semantic status badges, desktop tables/mobile financial cards, accessible action menus and row/metric/chart skeletons. The chart uses a light grid, matching the workspace. Account, membership, wallet and payment forms share the same controls and surfaces.

## Responsive matrix

Browser viewport overrides: 375×812, 390×844, 414×896, 768×1024, 1366×768, 1440×900, 1920×1080.

| Group | Routes | Checks | Result |
| --- | --- | --- | --- |
| User | Overview, watchlist, market, instrument trade, positions, orders, portfolio, leaderboard, account, membership, wallet, payments | 84 | Headings present; no horizontal document overflow |
| Admin | Overview, users, user details, stocks, trading-history guidance, synthetic leaderboard, settings | 49 | Headings present; no horizontal document overflow |
| Auth | Login, signup, admin login | 21 | Forms render; no horizontal document overflow |

Windows vertical scrollbars reduce the document client width by 15px on scrollable pages; overflow comparisons used clientWidth against scrollWidth.

Visually inspected desktop admin overview, phone chart/fixed actions, full-screen order form and populated order cards. Phone order sheets match all three viewport widths/heights, use auto-scrolling content, 16px inputs and 48px submit buttons. A reduced 390×500 viewport confirms the form remains scrollable under constrained height; this is not a claim of physical-device keyboard testing. Safe-area spacing reserves room for both bottom navigation and trade actions.

## Interactions and states

- User and admin login with separate isolated fixture sessions.
- Admin overview Refresh, mobile drawer navigation and compact instrument action menu.
- Instrument edit dialog retains name and documented 52-week high/low fields; conditional 52-week table columns show only when returned by the server.
- BUY market/limit and SELL market controls remain backed by the existing service. Invalid quantity and missing limit price produce inline errors. Fixture BUY limit returned PENDING; fixture SELL market returned EXECUTED. Populated mobile order history displays both records and semantic status badges.
- Order-sheet close control, price-type selection and full-height scrolling checked.
- Empty watchlist/order states and loading skeletons render in the light theme.
- Stopping the isolated API produced the server-unavailable error/Retry state. Restarting it and pressing Retry recovered to the market page.
- Fresh production-bundle login renders with no browser console errors or warnings.

## Build and unchanged functionality

`npm test`: all 13 existing authentication/service contract tests pass. Final `npm run build`: successful, no large-chunk warning. This redesign changes presentation and shared UI structure; existing authentication, role validation, token refresh, routes, API payloads, quote polling, candle normalization, order validation, server-calculated P&L and payment verification remain intact. Backend files were not edited.

## Backend limitations

Populated order/admin checks use `scripts/qa-fixture-server.mjs` in a separate QA Vite mode. Fixtures are never imported by production and are not a market-data fallback. The normal development/production configuration still targets the existing Render API.

Previously verified live reads returned empty instruments/search and zero balances for a new trial account. Live admin CRUD requires valid admin credentials; real trading/provider history requires initialized instruments and funded eligibility. No real Cashfree charge was made. No published endpoint exists for platform-wide admin orders, cancellation, arbitrary settings or browser quote sockets. These limitations remain explained in the UI and `API_CONTRACT.md`; no endpoint or financial data was fabricated.
