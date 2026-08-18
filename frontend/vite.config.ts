import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3001,
    proxy: {
      "/api": {
        target: "http://localhost:7862",
        changeOrigin: true,
      },
      "/livekit": {
        target: "http://localhost:7862",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:7862",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});