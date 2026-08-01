import { NextResponse } from "next/server";

import { checkReadinessHealth } from "@/shared/infrastructure/observability/application-health";

/**
 * Readiness probe for load balancers / orchestrators.
 * Verifies required configuration, Prisma client, and PostgreSQL connectivity.
 * Unauthenticated by design — do not expose sensitive connection details.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const snapshot = await checkReadinessHealth();
  const sanitizedChecks = {
    configuration: { ok: snapshot.checks.configuration.ok },
    prisma: { ok: snapshot.checks.prisma.ok },
    ...(snapshot.checks.database
      ? {
          database: {
            ok: snapshot.checks.database.ok,
            prisma: snapshot.checks.database.prisma,
            connectivity: snapshot.checks.database.connectivity,
            migrations: {
              ok: snapshot.checks.database.migrations.ok,
              appliedCount: snapshot.checks.database.migrations.appliedCount,
            },
          },
        }
      : {}),
  };

  return NextResponse.json(
    {
      status: snapshot.ok ? "ready" : "not_ready",
      probe: "readiness",
      service: snapshot.service,
      timestamp: snapshot.timestamp,
      uptimeSeconds: snapshot.uptimeSeconds,
      checks: sanitizedChecks,
    },
    {
      status: snapshot.ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
