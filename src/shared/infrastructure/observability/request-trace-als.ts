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
// One store per process, kept on globalThis like the organization scope:
// Next.js bundles route handlers separately, and a per-bundle instance meant
// code in other bundles (the audit logger) could not see who was signed in,
// so the activity log lost "who did it" (A-to-Z test, 2026-11-19).
const globalForTrace = globalThis as unknown as {
  rentcoreRequestTrace?: AsyncLocalStorage<RequestTraceStore>;
};

export const requestTraceAls = (globalForTrace.rentcoreRequestTrace ??=
  new AsyncLocalStorage<RequestTraceStore>());

export function enterRequestTrace(store: RequestTraceStore): void {
  requestTraceAls.enterWith(store);
}

export function getRequestTrace(): RequestTraceStore | undefined {
  return requestTraceAls.getStore();
}
