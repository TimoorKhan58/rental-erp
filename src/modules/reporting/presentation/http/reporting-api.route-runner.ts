import type { NextRequest } from "next/server";

import type { ReportingApplicationServices } from "@/modules/reporting/application/services/reporting-application-services.interface";
import type { ExecutionContext } from "@/shared/application/context";
import { assertPermission } from "@/shared/application/authorization";
import type { Permission } from "@/shared/application/authorization";
import {
  normalizeError,
  serializeAppError,
} from "@/shared/infrastructure/errors";
import {
  authenticateApiRequest,
  toUnauthorizedRouteResult,
} from "@/shared/infrastructure/http/authenticate-api-request";
import {
  errorResponse,
  successResponse,
  type RouteHandlerResult,
} from "@/shared/infrastructure/http/api-response";
import { getRequestId } from "@/shared/infrastructure/http/headers";

export interface ReportingApiRouteOptions<T> {
  request: NextRequest;
  route: string;
  httpMethod: string;
  permission: Permission;
  resolveServices: (ctx: ExecutionContext) => ReportingApplicationServices;
  handler: (
    ctx: ExecutionContext,
    services: ReportingApplicationServices,
  ) => Promise<T>;
}

export async function runReportingApiRoute<T>(
  options: ReportingApiRouteOptions<T>,
): Promise<RouteHandlerResult<T>> {
  const { request, route, httpMethod, permission, resolveServices, handler } =
    options;
  const requestId = getRequestId(request.headers);

  try {
    const { ctx } = await authenticateApiRequest(request, route, httpMethod);

    assertPermission(ctx.request, permission);

    const services = resolveServices(ctx);
    const data = await handler(ctx, services);

    return {
      status: 200,
      body: successResponse(data, requestId),
    };
  } catch (error) {
    const authFailure = toUnauthorizedRouteResult(error, requestId);

    if (authFailure.status === 401) {
      return authFailure;
    }

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
