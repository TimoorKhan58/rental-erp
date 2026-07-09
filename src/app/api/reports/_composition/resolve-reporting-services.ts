import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { ReportingServiceResolver } from "@/modules/reporting/application/services/reporting-application-services.interface";
import { createReportingApplicationServices } from "@/modules/reporting/infrastructure";

export const resolveReportingApplicationServices: ReportingServiceResolver =
  (ctx: ExecutionContext) =>
    createReportingApplicationServices(
      createSharedDepsFromExecutionContext(ctx),
    );
