import { env } from "./env";

export const databaseConfig = {
  url: env.DATABASE_URL,
} as const;

export type DatabaseConfig = typeof databaseConfig;

export function getDatabaseUrl(): string {
  return databaseConfig.url;
}

export function isDatabaseConfigured(): boolean {
  return databaseConfig.url.length > 0;
}
