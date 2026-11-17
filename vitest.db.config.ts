import path from "node:path";
import { defineConfig } from "vitest/config";

import { TEST_ENV } from "./vitest.config";

/**
 * Database tests (`npm run test:db`): run against a real, migrated,
 * disposable PostgreSQL given in DATABASE_URL. Never point this at live data.
 */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("test:db needs DATABASE_URL pointing at a disposable, migrated database");
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.db.test.ts"],
    env: { ...TEST_ENV, DATABASE_URL: databaseUrl },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
