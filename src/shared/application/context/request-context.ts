export interface RequestContext {
  requestId: string;
  /** Distributed correlation ID; defaults to requestId when not provided inbound. */
  correlationId: string;
  /** Optional tenant scope (single-tenant deployments leave this undefined). */
  tenantId?: string;
  userId?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
  route?: string;
  httpMethod?: string;
  timestamp: Date;
  /** High-resolution start marker for request duration (performance.now()). */
  startedAtMs: number;
}

export type CreateRequestContextInput = Partial<
  Omit<RequestContext, "requestId" | "correlationId" | "timestamp" | "startedAtMs">
> &
  Pick<RequestContext, "requestId"> & {
    correlationId?: string;
    startedAtMs?: number;
  };

export function createRequestContext(
  input: CreateRequestContextInput,
): RequestContext {
  return {
    requestId: input.requestId,
    correlationId: input.correlationId ?? input.requestId,
    tenantId: input.tenantId,
    userId: input.userId,
    role: input.role,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    route: input.route,
    httpMethod: input.httpMethod,
    timestamp: new Date(),
    startedAtMs: input.startedAtMs ?? performance.now(),
  };
}

/** Elapsed milliseconds since request context creation. */
export function getRequestDurationMs(request: RequestContext): number {
  return Math.max(0, performance.now() - request.startedAtMs);
}
