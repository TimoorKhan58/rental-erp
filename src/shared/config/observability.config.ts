import { env } from "./env";

export const observabilityConfig = {
  metrics: {
    enabled: env.ENABLE_METRICS,
    /** When set, GET /api/metrics requires Authorization: Bearer <token>. */
    bearerToken: env.METRICS_BEARER_TOKEN,
  },
  errorTracker: {
    provider: env.ERROR_TRACKER_PROVIDER,
    dsn: env.ERROR_TRACKER_DSN,
  },
} as const;

export type ObservabilityConfig = typeof observabilityConfig;
