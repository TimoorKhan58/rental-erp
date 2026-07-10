import type { SystemSettingId } from "@/shared/domain/ids";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  repositoryFindFirst,
  repositoryUpdate,
} from "@/shared/infrastructure/database";

import type { SystemSettings } from "@/modules/settings/domain/system-settings.entity";
import type { ISystemSettingsRepository } from "@/modules/settings/domain/system-settings.repository.interface";
import type { UpdateSystemSettingsData } from "@/modules/settings/domain/settings.types";

import {
  toSystemSettingsDomain,
  toSystemSettingsUpdateInput,
} from "../mappers/system-settings.persistence.mapper";

const MODEL = "SystemSetting";

export class PrismaSystemSettingsRepository implements ISystemSettingsRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findActive(): Promise<SystemSettings | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.systemSetting.findFirst({
          orderBy: { createdAt: "asc" },
        }),
      { model: MODEL, operation: "findActive" },
    ).then((record) => (record ? toSystemSettingsDomain(record) : null));
  }

  update(
    id: SystemSettingId,
    data: UpdateSystemSettingsData,
  ): Promise<SystemSettings> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.systemSetting.update({
          where: { id },
          data: toSystemSettingsUpdateInput(data),
        }),
      { model: MODEL, operation: "update" },
    ).then(toSystemSettingsDomain);
  }
}
