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

  return NextResponse.json(
    {
      status: snapshot.ok ? "ready" : "not_ready",
      probe: "readiness",
      service: snapshot.service,
      timestamp: snapshot.timestamp,
      uptimeSeconds: snapshot.uptimeSeconds,
      checks: snapshot.checks,
    },
    {
      status: snapshot.ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
