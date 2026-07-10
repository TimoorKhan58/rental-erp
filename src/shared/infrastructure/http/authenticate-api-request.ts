import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import {
  createExecutionContext,
  createRequestContext,
  type ExecutionContext,
} from "@/shared/application/context";
import { appConfig } from "@/shared/config/app.config";
import {
  normalizeError,
  serializeAppError,
  UnauthorizedError,
} from "@/shared/infrastructure/errors";
import { errorResponse } from "@/shared/infrastructure/http/api-response";
import { getRequestId } from "@/shared/infrastructure/http/headers";
import {
  createConsoleLogger,
  createRequestLogger,
} from "@/shared/infrastructure/logging";
import { resolveSessionUser } from "@/shared/infrastructure/auth";

export interface AuthenticatedApiRequestResult {
  requestId: string;
  ctx: ExecutionContext;
}

export async function authenticateApiRequest(
  request: NextRequest,
  route: string,
  httpMethod: string,
): Promise<AuthenticatedApiRequestResult> {
  const requestId = getRequestId(request.headers);

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

  const requestContext = createRequestContext({
    requestId,
    route,
    httpMethod,
    userId: resolvedUser.erpUserId,
    role: resolvedUser.role,
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  const baseLogger = createConsoleLogger({ level: appConfig.logging.level });
  const logger = createRequestLogger(baseLogger, {
    requestId,
    route,
    userId: resolvedUser.erpUserId,
  });

  return {
    requestId,
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
