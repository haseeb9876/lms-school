import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    // Mirrors the "@/*" path alias in tsconfig.json so tests import modules
    // by the same specifier the application code uses.
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
