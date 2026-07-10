import { SettingsInvariantError } from "@/modules/settings/domain/settings.errors";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { SettingsProfileDto } from "../dtos/settings.dto";
import {
  toSettingsProfileDto,
  toUpdateSettingsData,
  toUpdateSystemSettingsData,
} from "../mappers/settings.mapper";
import {
  UpdateSettingsSchema,
  type UpdateSettingsInput,
} from "../schemas/settings.schemas";
import {
  toCompanySettingsAuditValues,
  toSystemSettingsAuditValues,
} from "./settings-audit.mapper";
import {
  SETTINGS_ENTITY_NAME,
  SETTINGS_MODULE,
  SYSTEM_SETTINGS_ENTITY_NAME,
} from "./settings-service.constants";
import type { ISettingsTransactionRunner } from "./settings-transaction.runner";

export class UpdateSettingsService {
  constructor(private readonly transactionRunner: ISettingsTransactionRunner) {}

  async execute(input: UpdateSettingsInput): Promise<SettingsProfileDto> {
    const data = parseRequest(UpdateSettingsSchema, input);
    const companyUpdateData =
      data.company !== undefined ? toUpdateSettingsData(data.company) : undefined;
    const systemUpdateData =
      data.system !== undefined
        ? toUpdateSystemSettingsData(data.system)
        : undefined;

    return this.transactionRunner.run(
      async ({ settingsRepository, systemSettingsRepository, auditLogger }) => {
        const [existingCompany, existingSystem] = await Promise.all([
          settingsRepository.findActive(),
          systemSettingsRepository.findActive(),
        ]);

        if (existingCompany === null) {
          throw new NotFoundError({
            message: "Company settings not found",
          });
        }

        if (existingSystem === null) {
          throw new NotFoundError({
            message: "System settings not found",
          });
        }

        try {
          if (companyUpdateData !== undefined) {
            existingCompany.withUpdated(companyUpdateData);
          }

          if (systemUpdateData !== undefined) {
            existingSystem.withUpdated(systemUpdateData);
          }
        } catch (error) {
          if (error instanceof SettingsInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        let updatedCompany = existingCompany;
        let updatedSystem = existingSystem;

        if (companyUpdateData !== undefined) {
          const previousValues = toCompanySettingsAuditValues(existingCompany);

          updatedCompany = await settingsRepository.update(
            existingCompany.id,
            companyUpdateData,
          );

          await auditLogger.log({
            module: SETTINGS_MODULE,
            entityName: SETTINGS_ENTITY_NAME,
            recordId: updatedCompany.id,
            action: "UPDATE",
            status: "SUCCESS",
            oldValues: previousValues,
            newValues: toCompanySettingsAuditValues(updatedCompany),
          });
        }

        if (systemUpdateData !== undefined) {
          const previousValues = toSystemSettingsAuditValues(existingSystem);

          updatedSystem = await systemSettingsRepository.update(
            existingSystem.id,
            systemUpdateData,
          );

          await auditLogger.log({
            module: SETTINGS_MODULE,
            entityName: SYSTEM_SETTINGS_ENTITY_NAME,
            recordId: updatedSystem.id,
            action: "UPDATE",
            status: "SUCCESS",
            oldValues: previousValues,
            newValues: toSystemSettingsAuditValues(updatedSystem),
          });
        }

        return toSettingsProfileDto(updatedCompany, updatedSystem);
      },
    );
  }
}
