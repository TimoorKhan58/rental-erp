import {
  DashboardDefaultNotFoundError,
  DashboardInvariantError,
  DashboardLayoutAlreadyExistsError,
} from "@/modules/dashboard/domain/dashboard.errors";
import { normalizeCreateDashboardLayoutData } from "@/modules/dashboard/domain/dashboard.rules";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { DashboardLayoutDto } from "../dtos/dashboard.dto";
import {
  toCreateDashboardLayoutData,
  toDashboardLayoutDto,
} from "../mappers/dashboard.mapper";
import {
  CreateDashboardLayoutSchema,
  type CreateDashboardLayoutInput,
} from "../schemas/dashboard.schemas";
import { toDashboardLayoutAuditValues } from "./dashboard-audit.mapper";
import {
  DASHBOARD_LAYOUT_ENTITY_NAME,
  DASHBOARD_MODULE,
} from "./dashboard-service.constants";
import type { IDashboardTransactionRunner } from "./dashboard-transaction.runner";

export class CreateDashboardLayoutService {
  constructor(private readonly transactionRunner: IDashboardTransactionRunner) {}

  async execute(
    userId: string,
    input: CreateDashboardLayoutInput,
  ): Promise<DashboardLayoutDto> {
    const data = parseRequest(CreateDashboardLayoutSchema, input);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findByUserId(userId);

      if (existing !== null) {
        const conflict = new DashboardLayoutAlreadyExistsError(userId);
        throw new ConflictError({
          message: conflict.message,
          details: { userId },
        });
      }

      const defaultTemplate = await repository.findDefaultDashboardTemplate();

      if (defaultTemplate === null) {
        const notFound = new DashboardDefaultNotFoundError();
        throw new NotFoundError({
          message: notFound.message,
        });
      }

      try {
        const layout = await repository.create(
          userId,
          normalizeCreateDashboardLayoutData(toCreateDashboardLayoutData(data)),
        );

        await auditLogger.log({
          module: DASHBOARD_MODULE,
          entityName: DASHBOARD_LAYOUT_ENTITY_NAME,
          recordId: layout.id,
          action: "CREATE",
          status: "SUCCESS",
          newValues: toDashboardLayoutAuditValues(layout),
        });

        return toDashboardLayoutDto(layout);
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
