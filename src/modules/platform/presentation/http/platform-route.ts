import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NotFoundError } from "@/shared/infrastructure/errors";
import { successResponse } from "@/shared/infrastructure/http/api-response";
import { resolveClientIp } from "@/shared/infrastructure/http/client-ip";
import { getRequestId } from "@/shared/infrastructure/http/headers";
import { runCatchingApiHandler } from "@/shared/infrastructure/http/run-catching-api-handler";
import { toJsonResponse } from "@/shared/infrastructure/http/to-json-response";
import { runAsSystem } from "@/shared/infrastructure/tenancy/organization-scope";

import {
  findActivePlatformOwner,
  recordPlatformAudit,
  type PlatformAuditEntry,
  type PlatformOwnerIdentity,
} from "../../infrastructure/platform-owner.repository";

export type PlatformRequestContext = {
  readonly owner: PlatformOwnerIdentity;
  readonly requestId: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  /** Records a platform action by this owner (with request ip/agent). */
  readonly audit: (
    entry: Omit<PlatformAuditEntry, "platformOwnerId" | "ipAddress" | "userAgent">,
  ) => Promise<void>;
};

/**
 * Platform pages and APIs are only for active platform owners (SaaS phase
 * 3b). Everyone else — signed out, or a business user including owners —
 * gets "not found", so the platform area does not reveal itself.
 */
export async function authenticatePlatformRequest(request: NextRequest): Promise<PlatformRequestContext> {
  const session = await auth.api.getSession({ headers: request.headers });
  const owner = session === null ? null : await findActivePlatformOwner(prisma, session.user.id);

  if (owner === null) {
    throw new NotFoundError({ message: "Requested resource was not found." });
  }

  const ipAddress = resolveClientIp(request.headers);
  const userAgent = request.headers.get("user-agent") ?? undefined;

  return {
    owner,
    requestId: getRequestId(request.headers),
    ipAddress,
    userAgent,
    audit: (entry) =>
      recordPlatformAudit(prisma, { ...entry, platformOwnerId: owner.id, ipAddress, userAgent }),
  };
}

/**
 * Runs a platform API handler. Platform code is the one place allowed to
 * work across businesses, so it runs in an explicit, named system scope.
 */
export function runPlatformRoute<T>(
  request: NextRequest,
  action: string,
  handler: (ctx: PlatformRequestContext) => Promise<T>,
): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const ctx = await authenticatePlatformRequest(request);
    const data = await runAsSystem(`platform:${action}`, () => handler(ctx));

    return toJsonResponse({ status: 200, body: successResponse(data, ctx.requestId) });
  });
}
