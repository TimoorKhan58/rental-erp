import type { RequestContext } from "@/shared/application/context";

import {
  createRequestLogContext,
  type RequestLogContext,
} from "@/shared/infrastructure/request";

export function createStorageLogContext(
  request: RequestContext,
): RequestLogContext {
  return createRequestLogContext(request);
}
