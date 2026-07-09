import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { ProductServiceResolver } from "@/modules/product/application/services/product-application-services.interface";
import { createProductApplicationServices } from "@/modules/product/infrastructure";

export const resolveProductApplicationServices: ProductServiceResolver = (
  ctx: ExecutionContext,
) => createProductApplicationServices(createSharedDepsFromExecutionContext(ctx));
