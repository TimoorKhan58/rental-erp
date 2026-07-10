import { DashboardLayoutNotFoundError } from "@/modules/dashboard/domain/dashboard.errors";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { DashboardLayoutDto } from "../dtos/dashboard.dto";
import { toDashboardLayoutDto } from "../mappers/dashboard.mapper";
import { toDashboardLayoutAuditValues } from "./dashboard-audit.mapper";
import {
  DASHBOARD_LAYOUT_ENTITY_NAME,
  DASHBOARD_MODULE,
} from "./dashboard-service.constants";
import type { IDashboardTransactionRunner } from "./dashboard-transaction.runner";

export class ResetDashboardLayoutService {
  constructor(private readonly transactionRunner: IDashboardTransactionRunner) {}

  async execute(userId: string): Promise<DashboardLayoutDto> {
    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findByUserId(userId);

      if (existing === null) {
        const notFound = new DashboardLayoutNotFoundError(userId);
        throw new NotFoundError({
          message: notFound.message,
          details: { userId },
        });
      }

      const previousValues = toDashboardLayoutAuditValues(existing);
      const reset = await repository.reset(userId);

      await auditLogger.log({
        module: DASHBOARD_MODULE,
        entityName: DASHBOARD_LAYOUT_ENTITY_NAME,
        recordId: reset.id,
        action: "UPDATE",
        status: "SUCCESS",
        oldValues: previousValues,
        newValues: toDashboardLayoutAuditValues(reset),
      });

      return toDashboardLayoutDto(reset);
    });
  }
}
