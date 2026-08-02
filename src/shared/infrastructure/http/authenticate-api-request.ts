import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import {
  createExecutionContext,
  createRequestContext,
  type ExecutionContext,
} from "@/shared/application/context";
import {
  normalizeError,
  serializeAppError,
  UnauthorizedError,
} from "@/shared/infrastructure/errors";
import { errorResponse } from "@/shared/infrastructure/http/api-response";
import {
  getCorrelationId,
  getRequestId,
  getTenantId,
} from "@/shared/infrastructure/http/headers";
import { resolveClientIp } from "@/shared/infrastructure/http/client-ip";
import {
  createAppLogger,
  createRequestLogger,
} from "@/shared/infrastructure/logging";
import { resolveSessionUser } from "@/shared/infrastructure/auth/resolve-session-user";
import { ensureActiveErpUser } from "@/shared/infrastructure/auth/ensure-active-erp-user";
import { isUserRole } from "@/shared/application/authorization/types";
import { enterRequestTrace } from "@/shared/infrastructure/observability/request-trace-als";

export interface AuthenticatedApiRequestResult {
  requestId: string;
  correlationId: string;
  ctx: ExecutionContext;
}

export async function authenticateApiRequest(
  request: NextRequest,
  route: string,
  httpMethod: string,
): Promise<AuthenticatedApiRequestResult> {
  const requestId = getRequestId(request.headers);
  const correlationId = getCorrelationId(request.headers, requestId);
  const tenantId = getTenantId(request.headers);

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (session === null) {
    throw new UnauthorizedError();
  }

  const resolvedUser = resolveSessionUser(session);

  if (resolvedUser === null) {
    throw new UnauthorizedError({
      message: "User account is not linked to the ERP identity",
    });
  }

  const erpUser = await ensureActiveErpUser(resolvedUser.erpUserId);
  // Prefer ERP Role table over AuthUser.role session cache for RBAC.
  const role = isUserRole(erpUser.roleName)
    ? erpUser.roleName
    : resolvedUser.role;

  const requestContext = createRequestContext({
    requestId,
    correlationId,
    tenantId,
    route,
    httpMethod,
    userId: resolvedUser.erpUserId,
    role,
    ipAddress: resolveClientIp(request.headers),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  enterRequestTrace({
    requestId,
    correlationId,
    tenantId,
    userId: resolvedUser.erpUserId,
    route,
    httpMethod,
    startedAtMs: requestContext.startedAtMs,
  });

  const baseLogger = createAppLogger();
  const logger = createRequestLogger(baseLogger, {
    requestId,
    correlationId,
    tenantId,
    route,
    httpMethod,
    userId: resolvedUser.erpUserId,
  });

  return {
    requestId,
    correlationId,
    ctx: createExecutionContext({
      request: requestContext,
      logger,
    }),
  };
}

export function toUnauthorizedRouteResult(
  error: unknown,
  requestId: string,
): { status: number; body: ReturnType<typeof errorResponse> } {
  const normalized = normalizeError(error);
  const serialized = serializeAppError(normalized, requestId);

  return {
    status: normalized.httpStatus,
    body: errorResponse(serialized.error, requestId),
  };
}
