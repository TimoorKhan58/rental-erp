/**
 * Next.js instrumentation hook (Phase 8-007).
 * Registers process-level observability without changing business modules.
 *
 * Vendor SDKs (Sentry, Datadog, OpenTelemetry, etc.) should be initialized here
 * when ERROR_TRACKER_PROVIDER / OTEL_* are configured — see docs/production/OBSERVABILITY.md.
 */

/** Next.js passes Node's IncomingMessage header dict, not the Fetch Headers API. */
function toWebHeaders(
  headers: NodeJS.Dict<string | string[]>,
): Headers {
  const out = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        out.append(key, item);
      }
    } else {
      out.set(key, value);
    }
  }

  return out;
}

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
  request: {
    path: string;
    method: string;
    headers: NodeJS.Dict<string | string[]>;
  },
  _context: { routerKind: string; routePath: string },
): Promise<void> {
  const { reportRouteError } = await import(
    "@/shared/infrastructure/observability/error-tracker"
  );
  const { getRequestId, getCorrelationId, getTenantId } = await import(
    "@/shared/infrastructure/http/headers"
  );

  const headers = toWebHeaders(request.headers);
  const requestId = getRequestId(headers);
  const correlationId = getCorrelationId(headers, requestId);

  reportRouteError(error, {
    requestId,
    correlationId,
    tenantId: getTenantId(headers),
    route: request.path,
    httpMethod: request.method,
  });
}
