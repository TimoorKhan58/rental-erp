import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { DispatchServiceResolver } from "@/modules/dispatch/application/services/dispatch-application-services.interface";
import { createDispatchApplicationServices } from "@/modules/dispatch/infrastructure";

export const resolveDispatchApplicationServices: DispatchServiceResolver =
  (ctx: ExecutionContext) =>
    createDispatchApplicationServices(
      createSharedDepsFromExecutionContext(ctx),
      ctx.request.userId,
    );
