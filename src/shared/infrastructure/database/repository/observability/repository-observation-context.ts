import type { ExecutionContext, RequestContext } from "@/shared/application/context";
import { createRequestLogContext } from "@/shared/infrastructure/request";

export interface RepositoryObservationContext {
  requestId?: string;
  userId?: string;
  route?: string;
  httpMethod?: string;
  inTransaction?: boolean;
}

export function createRepositoryObservationContextFromRequest(
  request: RequestContext,
  override: Partial<RepositoryObservationContext> = {},
): RepositoryObservationContext {
  return {
    ...createRequestLogContext(request),
    ...override,
  };
}

export function createRepositoryObservationContextFromExecutionContext(
  ctx: ExecutionContext,
  override: Partial<RepositoryObservationContext> = {},
): RepositoryObservationContext {
  return createRepositoryObservationContextFromRequest(ctx.request, {
    inTransaction: ctx.tx !== undefined,
    ...override,
  });
}
