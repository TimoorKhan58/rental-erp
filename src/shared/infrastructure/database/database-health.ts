import { getPrismaClient } from "@/shared/infrastructure/database/prisma-client";

export interface DatabaseHealthResult {
  ok: boolean;
  prisma: "ok" | "error";
  connectivity: "ok" | "error";
  migrations: {
    ok: boolean;
    appliedCount: number;
    latest?: string;
    error?: string;
  };
  latencyMs?: number;
  error?: string;
}

/**
 * Operational database health probe — no business-module dependencies.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const started = Date.now();

  try {
    const prisma = getPrismaClient();

    await prisma.$queryRaw`SELECT 1 AS ok`;

    let appliedCount = 0;
    let latest: string | undefined;

    try {
      const rows = await prisma.$queryRaw<
        Array<{ migration_name: string; finished_at: Date | null }>
      >`
        SELECT migration_name, finished_at
        FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL
        ORDER BY finished_at DESC
        LIMIT 100
      `;

      appliedCount = rows.length;
      latest = rows[0]?.migration_name;
    } catch (migrationError) {
      return {
        ok: true,
        prisma: "ok",
        connectivity: "ok",
        migrations: {
          ok: false,
          appliedCount: 0,
          error:
            migrationError instanceof Error
              ? migrationError.message
              : "Unable to read _prisma_migrations",
        },
        latencyMs: Date.now() - started,
      };
    }

    return {
      ok: true,
      prisma: "ok",
      connectivity: "ok",
      migrations: {
        ok: true,
        appliedCount,
        latest,
      },
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      prisma: "error",
      connectivity: "error",
      migrations: {
        ok: false,
        appliedCount: 0,
      },
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Database check failed",
    };
  }
}
