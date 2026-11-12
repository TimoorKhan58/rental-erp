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
} from "@/shared/infrastructure/http/headers";
import { resolveClientIp } from "@/shared/infrastructure/http/client-ip";
import {
  createAppLogger,
  createRequestLogger,
} from "@/shared/infrastructure/logging";
import { resolveSessionUser } from "@/shared/infrastructure/auth/resolve-session-user";
import { ensureActiveErpUser } from "@/shared/infrastructure/auth/ensure-active-erp-user";
import { enterRequestTrace } from "@/shared/infrastructure/observability/request-trace-als";
import { runInOrganization } from "@/shared/infrastructure/tenancy/organization-scope";

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

  const { organizationId } = await ensureActiveErpUser(resolvedUser.erpUserId);

  // The business always comes from the signed-in user's record, never from
  // the request (the x-tenant-id header is ignored). Route runners execute
  // the request's work inside it via runInRequestOrganization.
  const tenantId = organizationId;

  const requestContext = createRequestContext({
    requestId,
    correlationId,
    tenantId,
    route,
    httpMethod,
    userId: resolvedUser.erpUserId,
    role: resolvedUser.role,
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

/**
 * Runs a request's work limited to the signed-in user's business, so every
 * per-business query inside it (repositories, transactions, audit,
 * notifications) is scoped by the organization guard.
 */
export function runInRequestOrganization<T>(
  ctx: ExecutionContext,
  operation: () => Promise<T>,
): Promise<T> {
  const organizationId = ctx.request.tenantId;

  if (!organizationId) {
    throw new UnauthorizedError({ message: "No business is linked to this request" });
  }

  return runInOrganization(organizationId, operation);
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
