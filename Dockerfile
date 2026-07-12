# syntax=docker/dockerfile:1.7

# =============================================================================
# Rental ERP — Production multi-stage Dockerfile
# Targets:
#   deps     — install full dependency tree (build cache layer)
#   builder  — Prisma generate + Next.js production build
#   runner   — minimal standalone runtime (DEFAULT)
#   migrate  — one-off Prisma migrate deploy job
# =============================================================================

ARG NODE_VERSION=22

# -----------------------------------------------------------------------------
# Dependencies
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS deps

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

# -----------------------------------------------------------------------------
# Builder
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env is required because shared/config/env.ts validates at import.
# Placeholders are for image compile only — override secrets at container runtime.
# APP_ENV=local disables staging/production hardening during `next build`.
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/rental_erp_build
ARG BETTER_AUTH_SECRET=docker-build-placeholder-secret-32chars
ARG APP_URL=http://localhost:3000
ARG BETTER_AUTH_URL=http://localhost:3000
ARG NODE_ENV=production
ARG APP_ENV=local

ENV DATABASE_URL=$DATABASE_URL \
    BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET \
    APP_URL=$APP_URL \
    BETTER_AUTH_URL=$BETTER_AUTH_URL \
    NODE_ENV=$NODE_ENV \
    APP_ENV=$APP_ENV \
    NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate \
  && npm run build

# -----------------------------------------------------------------------------
# Production runner (default)
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner

RUN apk add --no-cache libc6-compat openssl \
  && addgroup -S nodejs -g 1001 \
  && adduser -S nextjs -u 1001 -G nodejs

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_PATH=/app/uploads

# Standalone server output
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma client is generated outside node_modules (src/generated/prisma)
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated

# Writable uploads directory for local storage adapter
RUN mkdir -p /app/uploads \
  && chown -R nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

# -----------------------------------------------------------------------------
# Migrate job (optional one-off container)
# Usage:
#   docker build --target migrate -t rental-erp-migrate .
#   docker run --rm --env-file .env.production rental-erp-migrate
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS migrate

RUN apk add --no-cache libc6-compat openssl \
  && addgroup -S nodejs -g 1001 \
  && adduser -S nextjs -u 1001 -G nodejs

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    WAIT_FOR_DB=true \
    RUN_MIGRATIONS=false

COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/shared/config ./src/shared/config
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated
COPY --from=builder --chown=nextjs:nodejs /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh

USER nextjs

ENTRYPOINT ["/bin/sh", "/app/scripts/docker-entrypoint.sh"]
CMD ["npx", "prisma", "migrate", "deploy"]
