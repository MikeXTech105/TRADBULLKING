import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiUrl = env.VITE_API_BASE_URL ? new URL(env.VITE_API_BASE_URL) : null;
  return {
    cacheDir: `node_modules/.vite/${mode}`,
    plugins: [
      react(),
      VitePWA({
        registerType: "prompt",
        injectRegister: false,
        includeAssets: [
          "icons/apple-touch-icon.png",
          "icons/favicon-32.png",
          "icons/favicon-64.png",
        ],
        manifest: {
          name: "TRADBULLKING",
          short_name: "TRADBULLKING",
          description: "TRADBULLKING Paper Trading Platform",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait-primary",
          theme_color: "#101827",
          background_color: "#FFFFFF",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          // Precache only static build output (JS/CSS/HTML/images/fonts).
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
          // Never let the SPA navigation fallback or runtime caching intercept
          // live trading API calls — those must always hit the network.
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [],
        },
        devOptions: { enabled: false },
      }),
    ],
    resolve: {
      dedupe: ["react", "react-dom", "@emotion/react", "@emotion/styled"],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("/@mui/") || id.includes("/@emotion/"))
              return "mui-vendor";
            if (
              /\/(react|react-dom|react-router|react-router-dom|react-redux|scheduler|@reduxjs|redux|redux-thunk|immer)\//.test(
                id,
              )
            )
              return "react-vendor";
          },
        },
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      proxy: apiUrl
        ? {
            "/api": {
              target: apiUrl.origin,
              changeOrigin: true,
              rewrite: (path) =>
                apiUrl.pathname.replace(/\/$/, "") + path.replace(/^\/api/, ""),
            },
          }
        : undefined,
    },
  };
});
