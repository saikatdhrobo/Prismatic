import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  worker: { format: "es" },
  server: { host: "0.0.0.0", port: 5173, allowedHosts: true, headers: { "X-Frame-Options": "ALLOWALL" } },
  preview: { host: "0.0.0.0", port: 4173, allowedHosts: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
