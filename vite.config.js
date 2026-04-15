import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Skip gzip/brotli size reporting to speed up production builds.
    reportCompressedSize: false,
    // Target modern runtime used by current Electron/Chromium and modern browsers.
    target: "es2022",
    // `exceljs` is legitimately large even when lazy-loaded; keep warnings meaningful.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("exceljs")) return "exceljs";
          if (id.includes("jspdf") || id.includes("html2canvas"))
            return "pdf-tools";
        },
      },
    },
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
