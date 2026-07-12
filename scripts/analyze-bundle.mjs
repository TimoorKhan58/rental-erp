#!/usr/bin/env node
/**
 * Runs a production Next.js build with @next/bundle-analyzer enabled.
 * Usage: npm run analyze
 *
 * On Windows/macOS/Linux this sets ANALYZE=true without requiring cross-env.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "build"],
  {
    cwd: root,
    env: {
      ...process.env,
      ANALYZE: "true",
    },
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
