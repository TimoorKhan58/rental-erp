import { NextResponse } from "next/server";

/**
 * Liveness alias — same semantics as GET /api/health.
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
