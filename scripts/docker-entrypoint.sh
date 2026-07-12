#!/bin/sh
set -eu

# Optional production entry helper for the migrate image / ops jobs.
# The default app runner uses `node server.js` directly (see Dockerfile).

if [ "${WAIT_FOR_DB:-true}" = "true" ]; then
  echo "[entrypoint] Waiting for database connectivity..."
  node <<'NODE'
const { setTimeout: sleep } = require("node:timers/promises");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const maxAttempts = Number(process.env.DB_WAIT_ATTEMPTS || 30);
const delayMs = Number(process.env.DB_WAIT_DELAY_MS || 2000);

function parseHostPort(connectionString) {
  try {
    const normalized = connectionString.replace(/^postgresql:/, "http:");
    const parsed = new URL(normalized);
    return {
      host: parsed.hostname || "127.0.0.1",
      port: Number(parsed.port || 5432),
    };
  } catch {
    return { host: "db", port: 5432 };
  }
}

async function canConnect(host, port) {
  const net = require("node:net");
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    socket.setTimeout(2000);
    socket.on("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

(async () => {
  const { host, port } = parseHostPort(url);
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const ok = await canConnect(host, port);
    if (ok) {
      console.log(`[entrypoint] Database reachable at ${host}:${port}`);
      process.exit(0);
    }
    console.log(
      `[entrypoint] Attempt ${attempt}/${maxAttempts} — waiting for ${host}:${port}...`,
    );
    await sleep(delayMs);
  }
  console.error("[entrypoint] Timed out waiting for database");
  process.exit(1);
})();
NODE
fi

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[entrypoint] Running prisma migrate deploy..."
  npx prisma migrate deploy
fi

exec "$@"
