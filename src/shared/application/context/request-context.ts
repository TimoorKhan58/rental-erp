export interface RequestContext {
  requestId: string;
  userId?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
  route?: string;
  httpMethod?: string;
  timestamp: Date;
}

export type CreateRequestContextInput = Partial<RequestContext> &
  Pick<RequestContext, "requestId">;

export function createRequestContext(
  input: CreateRequestContextInput,
): RequestContext {
  return {
    requestId: input.requestId,
    userId: input.userId,
    role: input.role,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    route: input.route,
    httpMethod: input.httpMethod,
    timestamp: new Date(),
  };
}
