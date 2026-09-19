# TRADBULLKING frontend

Mobile-first paper trading app and administrator portal built with React, Vite, JavaScript, Material UI, Redux Toolkit, Axios, React Router, Lucide, TradingView Lightweight Charts and Cashfree.

## Run

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open http://localhost:3000. `npm run build` creates `dist`; `npm run preview` previews that build. Production hosting must rewrite application URLs to `index.html`.

Required public environment values:

```dotenv
VITE_API_BASE_URL=http://91.108.110.56/api
VITE_CASHFREE_MODE=sandbox
```

Cashfree mode must match the backend payment account: use `production` only with its production checkout sessions. Never place secret API/payment/provider credentials in Vite environment values. Development and production both call VITE_API_BASE_URL directly. Backend CORS must allow the frontend origin, including http://localhost:3000 for local development.

## Completed screens and integration

User: login, registration, overview, market search/exchange filters, watchlist, instrument details, candle chart, BUY market/limit and SELL market order entry, order history/details, open/closed positions, portfolio, backend P&L, leaderboard/public trader profile, account editing/password change, balances, membership and payment history/details/verification.

Admin: login, dashboard, user search/filter/details/trades/P&L/access toggle, stocks add/edit/delete/visibility/price sync, synthetic leaderboard CRUD, administrator account and AngelOne session initialization. `/admin/orders` links to supported per-user history because no platform-wide orders endpoint is published.

All application data uses the published API. Backend profiles determine roles, trading eligibility, trial/premium state and balances. No optimistic financial balance changes or fabricated market data are used. User/admin tokens are stored separately; remember-me persists user tokens, unchecked users and administrators use session storage. Axios queues concurrent refreshes and retries once; logout or a newer session cannot be overwritten by an older refresh. Passwords and AngelOne credentials are never persisted.

Registration requires explicit acceptance of the public Terms & Conditions and Privacy Policy. Legal document versions and shared commercial display values are centralized in `src/config/platform.js`. The published registration API does not currently accept or persist legal-acceptance evidence, so the frontend contract remains unchanged; the required backend enhancement and draft legal-review status are documented in `docs/LEGAL_ACCEPTANCE.md`. Signup navigation preserves only non-password fields in session storage.

One shared market polling scheduler runs up to three requests concurrently, refreshes the active instrument about every 2.5 seconds and visible watchlist rows about every 5 seconds, pauses in hidden tabs, removes unmounted subscriptions and backs off failures. Position P&L refreshes from the server every 10 seconds; portfolio/P&L every 15 seconds. No browser WebSocket handshake or event schema is documented, so no invented socket connection is used.

The chart uses `/stocks/{id}/historical` for validated OHLC candles and `/stocks/{id}/ltp` for the price line/current candle when timestamp information permits. ResizeObserver resizes it; crosshair, pan and zoom use Lightweight Charts. TradingView attribution and its notice are included.

Cashfree checkout receives only the backend-created payment session. Payment verification and a fresh backend profile establish activation; the UI never credits funds itself. The displayed offering is ₹500 total = ₹99 platform fee + ₹401 fee credit, with ₹5 crore virtual balance on server-confirmed activation. Pending payment IDs survive same-tab reloads to allow status verification and prevent duplicate checkout creation.

Mobile uses safe-area bottom navigation, full-screen scrollable order entry, fixed SELL/BUY actions, horizontally scrollable timeframes, readable financial cards and an admin hamburger drawer. Account shortcuts make secondary modules reachable from mobile navigation.

## Validation and limits

```powershell
npm test
npm run build
$env:TBK_QA_EMAIL='your-designated-qa-email'
$env:TBK_QA_PASSWORD='your-qa-password'
npm run test:api
```

`npm test` runs 13 service/authentication contract tests, including concurrent refresh, refresh failure, logout races, role checks, response adapters, order validation and endpoint payloads. `test:api` uses a designated account; pass `-- --register` only when you deliberately want to create that QA account. Sanitized live responses are recorded in `docs/live-responses.json`.

Browser QA used a separate local fixture API/Vite mode to exercise populated market/chart/order and admin mutations. Fixtures in `scripts/qa-fixture-server.mjs` are test-only and never imported into the application. They are not a production/demo fallback. See `docs/QA_REPORT.md` for viewport and interaction checks.

Live registration, login, profile, refresh and available read endpoints were checked. Live stocks/search returned empty arrays; a new account had zero balances despite an active trial. Live admin mutation checks need valid admin credentials; provider history/orders need funded accounts and initialized instruments. Cashfree checkout is implemented but a real provider payment has not been completed. The referenced Postman collection was not supplied. These constraints and exact contract differences are documented in `docs/API_CONTRACT.md`, alongside the OpenAPI snapshot in `docs/openapi.json`.

No endpoint is documented for platform-wide admin orders, arbitrary system settings, order cancellation or browser quote sockets. Unsupported functionality is explained gracefully. Backend code has not been modified.

## Light workspace redesign

The user and admin panels now share the COSMOS-reference layout: navy navigation, a compact white header, pale gray workspace, white bordered cards and compact tables. `src/designTokens.js` is the palette/radius/spacing reference, `src/theme.js` applies it to MUI and `src/index.css` holds the consolidated desktop/mobile styles. `WorkspaceChrome.jsx` shares sidebar/header structure, `DataView.jsx` shares headings/metrics/status/table behavior, and `RowActions.jsx` shares compact admin action menus. See `docs/REDESIGN_QA.md` for the seven-size responsive matrix and current redesign validation, including backend limitations.

## Official branding assets

`public/branding/tradbullking-logo-full.png` and `tradbullking-logo-transparent.png` are display-ready, tightly cropped copies of the supplied September 19 TRADE KING artwork. `src/components/Brand.jsx` centrally selects the full logo for auth, loading and membership, and the compact copy for user/admin workspace headers and navigation. The PWA and browser icons use the isolated bull mark from the same supplied artwork. White backing preserves the dark wordmark on navy sidebars, and plain TRADBULLKING text appears only after an image-load failure.

Branding checks: login/signup/admin login and user/admin overview/membership at 375×812, 768×1024 and 1440×900; all visible images loaded, contain scaling retained and no horizontal overflow. The isolated workspace QA console reported no warnings/errors. Production build passed after asset integration.

