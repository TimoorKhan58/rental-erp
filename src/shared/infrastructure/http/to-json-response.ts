import type { RouteHandlerResult } from "@/shared/infrastructure/http/api-response";
import {
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
} from "@/shared/infrastructure/http/headers";
import { getMetricsRegistry } from "@/shared/infrastructure/observability/prometheus-registry";
import { getRequestTrace } from "@/shared/infrastructure/observability/request-trace-als";

export interface InstrumentedJsonResponseOptions {
  method?: string;
  route?: string;
  correlationId?: string;
  durationMs?: number;
  /** When false, skip Prometheus HTTP counters. */
  recordMetrics?: boolean;
}

/**
 * Shared JSON response helper — echoes tracing headers and records HTTP metrics.
 */
export function toJsonResponse(
  result: RouteHandlerResult<unknown>,
  options: InstrumentedJsonResponseOptions = {},
): Response {
  const trace = getRequestTrace();
  const requestId = result.body.requestId;
  const correlationId =
    options.correlationId ?? trace?.correlationId ?? requestId;
  const method = options.method ?? trace?.httpMethod ?? "GET";
  const route = options.route ?? trace?.route ?? "api";
  const durationMs =
    options.durationMs ??
    (trace ? Math.max(0, performance.now() - trace.startedAtMs) : undefined);

  const headers = new Headers({
    "Cache-Control": "no-store",
    [REQUEST_ID_HEADER]: requestId,
    [CORRELATION_ID_HEADER]: correlationId,
  });

  if (options.recordMetrics !== false) {
    getMetricsRegistry().observeHttpRequest({
      method,
      route,
      status: result.status,
      durationMs,
    });
  }

  return Response.json(result.body, {
    status: result.status,
    headers,
  });
}
