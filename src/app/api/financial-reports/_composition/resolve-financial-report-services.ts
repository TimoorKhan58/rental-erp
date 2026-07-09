import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { FinancialReportServiceResolver } from "@/modules/financial-report/application/services/financial-report-application-services.interface";
import { createFinancialReportApplicationServices } from "@/modules/financial-report/infrastructure";

export const resolveFinancialReportApplicationServices: FinancialReportServiceResolver =
  (ctx: ExecutionContext) =>
    createFinancialReportApplicationServices(
      createSharedDepsFromExecutionContext(ctx),
    );
