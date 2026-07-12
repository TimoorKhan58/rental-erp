import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestTraceStore {
  requestId: string;
  correlationId: string;
  tenantId?: string;
  userId?: string;
  route?: string;
  httpMethod?: string;
  startedAtMs: number;
}

/**
 * Request-scoped trace store for metrics / response headers.
 * Populated by authenticateApiRequest / withHandler; read by toJsonResponse.
 * Does not replace ExecutionContext — operational only.
 */
export const requestTraceAls = new AsyncLocalStorage<RequestTraceStore>();

export function enterRequestTrace(store: RequestTraceStore): void {
  requestTraceAls.enterWith(store);
}

export function getRequestTrace(): RequestTraceStore | undefined {
  return requestTraceAls.getStore();
}
