import { isDatabaseConfigured } from "@/shared/config/database.config";
import { env } from "@/shared/config/env";
import { checkDatabaseHealth } from "@/shared/infrastructure/database/database-health";
import { getPrismaClient } from "@/shared/infrastructure/database/prisma-client";

export interface HealthCheckDetail {
  ok: boolean;
  detail?: string;
}

export interface ApplicationHealthSnapshot {
  ok: boolean;
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    configuration: HealthCheckDetail;
    prisma: HealthCheckDetail;
    database?: Awaited<ReturnType<typeof checkDatabaseHealth>>;
  };
}

const processStartedAt = Date.now();

/**
 * Lightweight configuration check — never returns secret values.
 */
export function checkConfigurationHealth(): HealthCheckDetail {
  const missing: string[] = [];

  if (!env.DATABASE_URL) {
    missing.push("DATABASE_URL");
  }
  if (!env.BETTER_AUTH_SECRET) {
    missing.push("BETTER_AUTH_SECRET");
  }
  if (!env.APP_URL) {
    missing.push("APP_URL");
  }

  if (missing.length > 0) {
    return {
      ok: false,
      detail: `Missing required configuration: ${missing.join(", ")}`,
    };
  }

  if (!isDatabaseConfigured()) {
    return { ok: false, detail: "Database URL is not configured" };
  }

  return { ok: true };
}

export function checkPrismaClientHealth(): HealthCheckDetail {
  try {
    getPrismaClient();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      detail:
        error instanceof Error
          ? error.message
          : "Prisma client unavailable",
    };
  }
}

export async function checkReadinessHealth(): Promise<ApplicationHealthSnapshot> {
  const configuration = checkConfigurationHealth();
  const prisma = checkPrismaClientHealth();
  const database = configuration.ok
    ? await checkDatabaseHealth()
    : undefined;

  const ok =
    configuration.ok &&
    prisma.ok &&
    (database?.ok ?? false);

  return {
    ok,
    service: "rental-erp",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - processStartedAt) / 1000),
    checks: {
      configuration,
      prisma,
      ...(database ? { database } : {}),
    },
  };
}

export function checkStartupHealth(): ApplicationHealthSnapshot {
  const configuration = checkConfigurationHealth();
  const prisma = checkPrismaClientHealth();
  const ok = configuration.ok && prisma.ok;

  return {
    ok,
    service: "rental-erp",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - processStartedAt) / 1000),
    checks: {
      configuration,
      prisma,
    },
  };
}
