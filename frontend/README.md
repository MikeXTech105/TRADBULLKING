# TRADBULLKING frontend

Authentication foundation built with React, Vite, JavaScript, React Router, Material UI, Axios, and Lucide React.

Run `npm install`, then `npm run dev`. Open http://localhost:5173. Use `npm run build` for a production build and `npm test` for mock authentication checks.

Routes: `/` redirects to `/login`; `/login`, `/signup`, and protected `/dashboard` serve users. `/admin` redirects to `/admin/login`; `/admin/login` and protected `/admin/dashboard` serve administrators. Unknown URLs redirect to the corresponding login page.

Development mock credentials:

- User: `user@tradbullking.com` / `123456`
- Admin: `admin@tradbullking.com` / `admin123`

Signup validates inputs and returns to login with a success notification. It does not create a persistent account; use the demo credentials to log in. Password recovery and final service terms await backend integration. All authentication and validation live in `src/services/authService.js`; no passwords are persisted.

User and admin localStorage keys are separate. Remember me retains the mock user session; unchecked user sessions and administrator sessions expire after 12 hours. This mock authentication is not production security. Replace it with backend authentication and authorization before deployment.

Copy `.env.example` to `.env` and configure `VITE_API_BASE_URL` when the backend is available. `src/services/api.js` provides the future Axios client; mock authentication requires no backend.

The supplied logo is in `public/logo.png`, with a text fallback on load failure. Production hosting must rewrite application routes to `index.html` for direct refreshes. Vite handles this during development.
