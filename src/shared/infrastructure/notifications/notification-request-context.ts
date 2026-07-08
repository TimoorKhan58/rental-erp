import type { RequestContext } from "@/shared/application/context";

import {
  createRequestLogContext,
  type RequestLogContext,
} from "@/shared/infrastructure/request";

export function createNotificationLogContext(
  request: RequestContext,
): RequestLogContext {
  return createRequestLogContext(request);
}
