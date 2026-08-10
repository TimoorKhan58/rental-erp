import path from "node:path";
import { defineConfig } from "vitest/config";

// React 19 only exposes `act` outside production builds. A lingering
// NODE_ENV=production (e.g. after `npm run build`) breaks RTL.
(process.env as Record<string, string | undefined>).NODE_ENV = "test";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.ui.test.tsx"],
    setupFiles: ["./src/test/ui/setup.ts"],
    restoreMocks: true,
    // Threads pool is more stable for RTL/jsdom in this repo than forks.
    pool: "threads",
    env: {
      NODE_ENV: "test",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
