import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Skip gzip/brotli size reporting to speed up production builds.
    reportCompressedSize: false,
    // Target modern runtime used by current Electron/Chromium and modern browsers.
    target: "es2022",
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      // route static uploads to the backend as well so that logos appear
      // correctly during development (vite itself doesn't serve the
      // server/uploads folder).
      "/uploads": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
