import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiUrl = env.VITE_API_BASE_URL ? new URL(env.VITE_API_BASE_URL) : null;
  return {
    cacheDir: `node_modules/.vite/${mode}`,
    plugins: [react()],
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
