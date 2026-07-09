import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/modules/customer/**/*.ts",
        "src/modules/supplier/**/*.ts",
        "src/modules/warehouse/**/*.ts",
        "src/modules/product/**/*.ts",
      ],
      exclude: [
        "src/modules/customer/**/*.test.ts",
        "src/modules/customer/tests/**",
        "src/modules/supplier/**/*.test.ts",
        "src/modules/supplier/tests/**",
        "src/modules/warehouse/**/*.test.ts",
        "src/modules/warehouse/tests/**",
        "src/modules/product/**/*.test.ts",
        "src/modules/product/tests/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
