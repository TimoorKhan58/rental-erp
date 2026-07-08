import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { CustomerServiceResolver } from "@/modules/customer/application/services/customer-application-services.interface";
import { createCustomerApplicationServices } from "@/modules/customer/infrastructure";

export const resolveCustomerApplicationServices: CustomerServiceResolver = (
  ctx: ExecutionContext,
) => createCustomerApplicationServices(createSharedDepsFromExecutionContext(ctx));
