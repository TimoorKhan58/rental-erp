import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import type { AccountingApplicationServices } from "@/modules/accounting/application/services/accounting-application-services.interface";
import {
  createExecutionContext,
  createRequestContext,
  type ExecutionContext,
} from "@/shared/application/context";
import { assertPermission } from "@/shared/application/authorization";
import type { Permission } from "@/shared/application/authorization";
import { isUserRole } from "@/shared/application/authorization/types";
import { appConfig } from "@/shared/config/app.config";
import {
  normalizeError,
  serializeAppError,
  UnauthorizedError,
} from "@/shared/infrastructure/errors";
import {
  errorResponse,
  successResponse,
  type RouteHandlerResult,
} from "@/shared/infrastructure/http/api-response";
import { getRequestId } from "@/shared/infrastructure/http/headers";
import {
  createConsoleLogger,
  createRequestLogger,
} from "@/shared/infrastructure/logging";

export interface AccountingApiRouteOptions<T> {
  request: NextRequest;
  route: string;
  httpMethod: string;
  permission: Permission;
  resolveServices: (ctx: ExecutionContext) => AccountingApplicationServices;
  handler: (
    ctx: ExecutionContext,
    services: AccountingApplicationServices,
  ) => Promise<T>;
}

export async function runAccountingApiRoute<T>(
  options: AccountingApiRouteOptions<T>,
): Promise<RouteHandlerResult<T>> {
  const { request, route, httpMethod, permission, resolveServices, handler } =
    options;
  const requestId = getRequestId(request.headers);

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (session === null) {
    const error = new UnauthorizedError();
    const serialized = serializeAppError(error, requestId);

    return {
      status: error.httpStatus,
      body: errorResponse(serialized.error, requestId),
    };
  }

  const role = isUserRole(session.user.role) ? session.user.role : undefined;

  const requestContext = createRequestContext({
    requestId,
    route,
    httpMethod,
    userId: session.user.id,
    role,
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  const baseLogger = createConsoleLogger({ level: appConfig.logging.level });
  const logger = createRequestLogger(baseLogger, {
    requestId,
    route,
    userId: session.user.id,
  });

  const ctx = createExecutionContext({
    request: requestContext,
    logger,
  });

  try {
    assertPermission(ctx.request, permission);

    const services = resolveServices(ctx);
    const data = await handler(ctx, services);

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
}

export function toJsonResponse(result: RouteHandlerResult<unknown>): Response {
  return Response.json(result.body, { status: result.status });
}
