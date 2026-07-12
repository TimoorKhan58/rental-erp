import { NextResponse } from "next/server";

import { checkStartupHealth } from "@/shared/infrastructure/observability/application-health";

/**
 * Startup probe — process has loaded required configuration and can construct Prisma.
 * Does not require a live database round-trip (use /api/health/ready for that).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const snapshot = checkStartupHealth();

  return NextResponse.json(
    {
      status: snapshot.ok ? "started" : "starting",
      probe: "startup",
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
