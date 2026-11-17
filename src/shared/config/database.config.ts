import { env } from "./env";

export const databaseConfig = {
  url: env.DATABASE_URL,
  pool: {
    max: env.DATABASE_POOL_MAX,
    idleTimeoutMillis: env.DATABASE_POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: env.DATABASE_POOL_CONNECTION_TIMEOUT_MS,
  },
  backup: {
    directory: env.BACKUP_DIR,
    retentionDays: env.BACKUP_RETENTION_DAYS,
  },
} as const;

export type DatabaseConfig = typeof databaseConfig;

export function getDatabaseUrl(): string {
  return databaseConfig.url;
}

export function isDatabaseConfigured(): boolean {
  return databaseConfig.url.length > 0;
}

/**
 * Startup setting that marks a connection as the application's. Row-level
 * security only restricts connections carrying it, so migrations, backups
 * and psql keep full access (see the phase-2c migration).
 */
export const APP_CONNECTION_OPTIONS = "-c rentcore.app=on";

/**
 * pg.Pool configuration for the Prisma driver adapter.
 * Tune via DATABASE_POOL_* environment variables.
 */
export function getDatabasePoolConfig(): {
  connectionString: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  options: string;
} {
  return {
    connectionString: databaseConfig.url,
    max: databaseConfig.pool.max,
    idleTimeoutMillis: databaseConfig.pool.idleTimeoutMillis,
    connectionTimeoutMillis: databaseConfig.pool.connectionTimeoutMillis,
    options: APP_CONNECTION_OPTIONS,
  };
}
