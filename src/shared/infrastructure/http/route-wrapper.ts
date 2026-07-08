import {
  createExecutionContext,
  createRequestContext,
  type ExecutionContext,
} from "@/shared/application/context";
import { appConfig } from "@/shared/config/app.config";
import {
  normalizeError,
  serializeAppError,
} from "@/shared/infrastructure/errors";
import {
  createConsoleLogger,
  createRequestLogger,
} from "@/shared/infrastructure/logging";

import {
  errorResponse,
  successResponse,
  type RouteHandlerResult,
} from "./api-response";
import { getRequestId } from "./headers";

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

    const request = createRequestContext({
      requestId,
      route: input?.route,
      httpMethod: input?.httpMethod,
      ipAddress: input?.headers?.get("x-forwarded-for") ?? undefined,
      userAgent: input?.headers?.get("user-agent") ?? undefined,
    });

    const baseLogger = createConsoleLogger({ level: appConfig.logging.level });
    const logger = createRequestLogger(baseLogger, {
      requestId,
      route: input?.route,
    });

    const ctx = createExecutionContext({
      request,
      logger,
    });

    try {
      const data = await handler(ctx);

      return {
        status: 200,
        body: successResponse(data, requestId),
      };
    } catch (error) {
      const normalized = normalizeError(error);
      const serialized = serializeAppError(normalized, requestId);

      return {
        status: normalized.httpStatus,
        body: errorResponse(serialized.error, requestId),
      };
    }
  };
}
