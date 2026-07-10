import {
  DashboardInvariantError,
  DashboardLayoutNotFoundError,
} from "@/modules/dashboard/domain/dashboard.errors";
import { mergeDashboardLayoutContent } from "@/modules/dashboard/domain/dashboard.rules";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { DashboardLayoutDto } from "../dtos/dashboard.dto";
import {
  toDashboardLayoutDto,
  toUpdateDashboardLayoutData,
} from "../mappers/dashboard.mapper";
import {
  UpdateDashboardLayoutSchema,
  type UpdateDashboardLayoutInput,
} from "../schemas/dashboard.schemas";
import { toDashboardLayoutAuditValues } from "./dashboard-audit.mapper";
import {
  DASHBOARD_LAYOUT_ENTITY_NAME,
  DASHBOARD_MODULE,
} from "./dashboard-service.constants";
import type { IDashboardTransactionRunner } from "./dashboard-transaction.runner";

export class UpdateDashboardLayoutService {
  constructor(private readonly transactionRunner: IDashboardTransactionRunner) {}

  async execute(
    userId: string,
    input: UpdateDashboardLayoutInput,
  ): Promise<DashboardLayoutDto> {
    const data = parseRequest(UpdateDashboardLayoutSchema, input);

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

      try {
        const mergedLayout = mergeDashboardLayoutContent(
          existing.toProps().layout,
          toUpdateDashboardLayoutData(data),
        );

        const updated = await repository.update(userId, mergedLayout);

        await auditLogger.log({
          module: DASHBOARD_MODULE,
          entityName: DASHBOARD_LAYOUT_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toDashboardLayoutAuditValues(updated),
        });

        return toDashboardLayoutDto(updated);
      } catch (error) {
        if (error instanceof DashboardInvariantError) {
          throw new UnprocessableError({
            message: error.message,
            details: { field: error.field },
          });
        }

        throw error;
      }
    });
  }
}
