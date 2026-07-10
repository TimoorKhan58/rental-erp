import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { CatalogServiceResolver } from "@/modules/catalog/application/services/catalog-application-services.interface";
import { createCatalogApplicationServices } from "@/modules/catalog/infrastructure";

export const resolveCatalogApplicationServices: CatalogServiceResolver = (
  ctx: ExecutionContext,
) =>
  createCatalogApplicationServices(createSharedDepsFromExecutionContext(ctx));
