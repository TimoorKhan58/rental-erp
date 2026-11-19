import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { appConfig } from "@/shared/config/app.config";
import { authConfig } from "@/shared/config/auth.config";
import {
  createExecutionContext,
  createRequestContext,
  type ExecutionContext,
} from "@/shared/application/context";
import {
  ERROR_CODES,
  ForbiddenError,
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

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function originOf(value: string): string | undefined {
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

/** RentCore's own addresses: the app URL, the auth URL and any extra trusted ones. */
export function trustedApiOrigins(): Set<string> {
  return new Set(
    [appConfig.url, authConfig.baseURL, ...authConfig.trustedOrigins]
      .map((value) => originOf(value.trim()))
      .filter((value): value is string => value !== undefined),
  );
}

/**
 * Extra protection against cross-site requests (A-to-Z test 2026-11-19): a
 * change (not GET) sent by a browser from another website is refused. The
 * session cookie is already SameSite=Lax; requests without an Origin header
 * (scripts, server-to-server) are not affected.
 */
export function assertTrustedOrigin(origin: string | null, httpMethod: string): void {
  if (origin === null || SAFE_METHODS.has(httpMethod.toUpperCase())) {
    return;
  }
  const normalized = originOf(origin);
  if (normalized === undefined || !trustedApiOrigins().has(normalized)) {
    throw new ForbiddenError({ message: "This request came from another website and was refused." });
  }
}

/** API paths a user with a temporary password may still call. */
export const PASSWORD_CHANGE_ALLOWED_PATHS = new Set(["/api/account/password"]);

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

  assertTrustedOrigin(request.headers.get("origin"), httpMethod);

  // Always check the session in the database, not the signed cookie cache:
  // otherwise a copied cookie kept working for up to 5 minutes after sign-out
  // (A-to-Z test, 2026-11-19). One indexed lookup per API request.
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
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

  const { organizationId, mustChangePassword } = await ensureActiveErpUser(
    resolvedUser.erpUserId,
  );

  // A temporary password (new business owner, or reset by someone else)
  // only opens the password-change endpoint (SaaS phase 3c).
  if (mustChangePassword && !PASSWORD_CHANGE_ALLOWED_PATHS.has(request.nextUrl.pathname)) {
    throw new ForbiddenError({
      code: ERROR_CODES.PASSWORD_CHANGE_REQUIRED,
      message: "Please choose a new password before continuing.",
    });
  }

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

  return runInOrganization(organizationId, operation, { userId: ctx.request.userId });
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
