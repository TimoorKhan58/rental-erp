import { env } from "./env";

/**
 * Reserved application cache TTL (seconds).
 * Phase 8-008: no Redis / HTTP response cache is wired — TanStack Query and
 * Nginx static caching cover current needs. See docs/production/PERFORMANCE.md.
 */
export const cacheConfig = {
  ttlSeconds: env.CACHE_TTL_SECONDS,
} as const;

export type CacheConfig = typeof cacheConfig;
