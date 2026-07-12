/**
 * Next.js instrumentation hook (Phase 8-007).
 * Registers process-level observability without changing business modules.
 *
 * Vendor SDKs (Sentry, Datadog, OpenTelemetry, etc.) should be initialized here
 * when ERROR_TRACKER_PROVIDER / OTEL_* are configured — see docs/production/OBSERVABILITY.md.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Eagerly initialize metrics registry / event-loop sampler.
    const { getMetricsRegistry } = await import(
      "@/shared/infrastructure/observability/prometheus-registry"
    );
    getMetricsRegistry();
  }
}

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Headers },
  _context: { routerKind: string; routePath: string },
): Promise<void> {
  const { reportRouteError } = await import(
    "@/shared/infrastructure/observability/error-tracker"
  );
  const { getRequestId, getCorrelationId, getTenantId } = await import(
    "@/shared/infrastructure/http/headers"
  );

  const requestId = getRequestId(request.headers);
  const correlationId = getCorrelationId(request.headers, requestId);

  reportRouteError(error, {
    requestId,
    correlationId,
    tenantId: getTenantId(request.headers),
    route: request.path,
    httpMethod: request.method,
  });
}
