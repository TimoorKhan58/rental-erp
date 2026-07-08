import type { RequestContext } from "@/shared/application/context";

export function createNotificationLogContext(
  request: RequestContext,
): Record<string, unknown> {
  return {
    requestId: request.requestId,
    userId: request.userId,
    route: request.route,
    httpMethod: request.httpMethod,
  };
}
