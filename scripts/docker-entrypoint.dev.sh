#!/bin/sh
set -eu

echo "[entrypoint] Generating Prisma client..."
npx prisma generate

echo "[entrypoint] Starting development server..."
exec "$@"
