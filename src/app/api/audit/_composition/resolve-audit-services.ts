import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { AuditServiceResolver } from "@/modules/audit/application/services/audit-application-services.interface";
import { createAuditApplicationServices } from "@/modules/audit/infrastructure";

export const resolveAuditApplicationServices: AuditServiceResolver = (
  ctx: ExecutionContext,
) => createAuditApplicationServices(createSharedDepsFromExecutionContext(ctx));
