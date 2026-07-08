import type { Prisma } from "@/generated/prisma/client";
import type { ILogger } from "@/shared/infrastructure/logging";

import type { RequestContext } from "./request-context";

export interface ExecutionContext {
  request: RequestContext;
  logger: ILogger;
  tx?: Prisma.TransactionClient;
  audit: unknown;
  permissions: unknown;
}

export interface CreateExecutionContextInput {
  request: RequestContext;
  logger: ILogger;
  tx?: Prisma.TransactionClient;
  audit?: unknown;
  permissions?: unknown;
}

export function createExecutionContext(
  input: CreateExecutionContextInput,
): ExecutionContext {
  return {
    request: input.request,
    logger: input.logger,
    tx: input.tx,
    audit: input.audit,
    permissions: input.permissions,
  };
}
