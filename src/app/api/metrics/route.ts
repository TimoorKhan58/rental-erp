import { NextResponse } from "next/server";

import { observabilityConfig } from "@/shared/config/observability.config";
import { renderPrometheusMetrics } from "@/shared/infrastructure/observability/prometheus-registry";

/**
 * Prometheus-compatible metrics scrape endpoint.
 * Optional bearer token via METRICS_BEARER_TOKEN.
 * Disable with ENABLE_METRICS=false.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const token = observabilityConfig.metrics.bearerToken;
  if (!token) {
    return true;
  }

  const header = request.headers.get("authorization")?.trim();
  if (!header) {
    return false;
  }

  const [scheme, value] = header.split(/\s+/, 2);
  return scheme?.toLowerCase() === "bearer" && value === token;
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!observabilityConfig.metrics.enabled) {
    return NextResponse.json(
      { error: "Metrics are disabled" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
          "WWW-Authenticate": 'Bearer realm="metrics"',
        },
      },
    );
  }

  const body = renderPrometheusMetrics();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
