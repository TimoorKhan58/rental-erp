import type { RequestContext } from "@/shared/application/context";

export interface RequestLogContext {
  requestId: string;
  correlationId: string;
  tenantId?: string;
  userId?: string;
  route?: string;
  httpMethod?: string;
}

export function createRequestLogContext(
  request: RequestContext,
): RequestLogContext {
  return {
    requestId: request.requestId,
    correlationId: request.correlationId,
    tenantId: request.tenantId,
    userId: request.userId,
    route: request.route,
    httpMethod: request.httpMethod,
  };
}
