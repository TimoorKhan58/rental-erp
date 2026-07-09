import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { SupplierServiceResolver } from "@/modules/supplier/application/services/supplier-application-services.interface";
import { createSupplierApplicationServices } from "@/modules/supplier/infrastructure";

export const resolveSupplierApplicationServices: SupplierServiceResolver = (
  ctx: ExecutionContext,
) => createSupplierApplicationServices(createSharedDepsFromExecutionContext(ctx));
