import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { AssetServiceResolver } from "@/modules/asset/application/services/asset-application-services.interface";
import { createAssetApplicationServices } from "@/modules/asset/infrastructure";

export const resolveAssetApplicationServices: AssetServiceResolver = (
  ctx: ExecutionContext,
) =>
  createAssetApplicationServices(
    createSharedDepsFromExecutionContext(ctx),
    ctx.request.userId,
  );
