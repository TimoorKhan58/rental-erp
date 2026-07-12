import {
  createExecutionContext,
  createRequestContext,
  getRequestDurationMs,
  type ExecutionContext,
} from "@/shared/application/context";
import {
  normalizeError,
  serializeAppError,
} from "@/shared/infrastructure/errors";
import {
  createAppLogger,
  createRequestLogger,
} from "@/shared/infrastructure/logging";
import { reportRouteError } from "@/shared/infrastructure/observability/error-tracker";
import { getMetricsRegistry } from "@/shared/infrastructure/observability/prometheus-registry";
import { enterRequestTrace } from "@/shared/infrastructure/observability/request-trace-als";

import {
  errorResponse,
  successResponse,
  type RouteHandlerResult,
} from "./api-response";
import {
  getCorrelationId,
  getRequestId,
  getTenantId,
} from "./headers";
import { resolveClientIp } from "./client-ip";

export interface RouteHandlerInput {
  headers?: Headers;
  route?: string;
  httpMethod?: string;
}

export type RouteHandler<T> = (ctx: ExecutionContext) => Promise<T>;

export function withHandler<T>(
  handler: RouteHandler<T>,
): (input?: RouteHandlerInput) => Promise<RouteHandlerResult<T>> {
  return async (input?: RouteHandlerInput) => {
    const requestId = getRequestId(input?.headers);
    const correlationId = getCorrelationId(input?.headers, requestId);
    const tenantId = getTenantId(input?.headers);
    const metrics = getMetricsRegistry();
    metrics.beginRequest();

    const request = createRequestContext({
      requestId,
      correlationId,
      tenantId,
      route: input?.route,
      httpMethod: input?.httpMethod,
      ipAddress: input?.headers ? resolveClientIp(input.headers) : undefined,
      userAgent: input?.headers?.get("user-agent") ?? undefined,
    });

    const baseLogger = createAppLogger();
    const logger = createRequestLogger(baseLogger, {
      requestId,
      correlationId,
      tenantId,
      route: input?.route,
      httpMethod: input?.httpMethod,
    });

    const ctx = createExecutionContext({
      request,
      logger,
    });

    enterRequestTrace({
      requestId,
      correlationId,
      tenantId,
      route: input?.route,
      httpMethod: input?.httpMethod,
      startedAtMs: request.startedAtMs,
    });

    try {
      const data = await handler(ctx);
      const durationMs = getRequestDurationMs(request);

      logger.info("Request completed", {
        status: 200,
        durationMs,
      });

      return {
        status: 200,
        body: successResponse(data, requestId),
      };
    } catch (error) {
      const normalized = normalizeError(error);
      const serialized = serializeAppError(normalized, requestId);
      const durationMs = getRequestDurationMs(request);

      if (normalized.httpStatus >= 500) {
        reportRouteError(error, {
          requestId,
          correlationId,
          tenantId,
          route: input?.route,
          httpMethod: input?.httpMethod,
        });
      }

      logger.error("Request failed", error, {
        status: normalized.httpStatus,
        durationMs,
      });

      return {
        status: normalized.httpStatus,
        body: errorResponse(serialized.error, requestId),
      };
    } finally {
      metrics.endRequest();
    }
  };
}
