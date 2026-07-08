import type { RequestContext } from "@/shared/application/context";

export interface RequestLogContext {
  requestId: string;
  userId?: string;
  route?: string;
  httpMethod?: string;
}

export function createRequestLogContext(
  request: RequestContext,
): RequestLogContext {
  return {
    requestId: request.requestId,
    userId: request.userId,
    route: request.route,
    httpMethod: request.httpMethod,
  };
}
