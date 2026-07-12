import { NextResponse } from "next/server";

/**
 * Liveness probe for container orchestration and Docker HEALTHCHECK.
 * Intentionally unauthenticated and free of database/business dependencies.
 *
 * Aliases:
 * - GET /api/health
 * - GET /api/health/live
 *
 * Related:
 * - GET /api/health/ready — readiness (DB + config)
 * - GET /api/health/startup — startup (config + Prisma client)
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: "ok",
      probe: "liveness",
      service: "rental-erp",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
