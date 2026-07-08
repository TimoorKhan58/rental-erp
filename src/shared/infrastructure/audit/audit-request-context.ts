import type { RequestContext } from "@/shared/application/context";

import { createAuditContext } from "./audit-context";
import type { AuditContext } from "./audit-logger.interface";

export function createAuditContextFromRequest(
  request: RequestContext,
  override: Partial<AuditContext> = {},
): AuditContext {
  return createAuditContext({
    userId: request.userId,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
    requestId: request.requestId,
    httpMethod: request.httpMethod,
    route: request.route,
    ...override,
  });
}
