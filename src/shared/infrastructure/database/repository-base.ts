import type { Prisma } from "@/generated/prisma/client";
import type { ExecutionContext } from "@/shared/application/context";

import { mapPrismaError } from "./prisma-error-mapper";
import { prisma } from "./prisma-client";
import type { DbClient } from "./prisma-types";

export function resolveDbClient(tx?: Prisma.TransactionClient): DbClient {
  return tx ?? prisma;
}

export function resolveDbClientFromContext(
  ctx: Pick<ExecutionContext, "tx">,
): DbClient {
  return resolveDbClient(ctx.tx);
}

export async function withPrismaError<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapPrismaError(error);
  }
}
