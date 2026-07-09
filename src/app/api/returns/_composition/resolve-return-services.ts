import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { ReturnServiceResolver } from "@/modules/return/application/services/return-application-services.interface";
import { createReturnApplicationServices } from "@/modules/return/infrastructure";

export const resolveReturnApplicationServices: ReturnServiceResolver = (
  ctx: ExecutionContext,
) =>
  createReturnApplicationServices(
    createSharedDepsFromExecutionContext(ctx),
    ctx.request.userId,
  );
