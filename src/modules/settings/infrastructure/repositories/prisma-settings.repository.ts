import type { CompanySettingId } from "@/shared/domain/ids";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  repositoryCreate,
  repositoryFindFirst,
  repositoryUpdate,
} from "@/shared/infrastructure/database";

import { SettingsNotFoundError } from "@/modules/settings/domain/settings.errors";
import type { Settings } from "@/modules/settings/domain/settings.entity";
import type { ISettingsRepository } from "@/modules/settings/domain/settings.repository.interface";
import type { CreateSettingsData, UpdateSettingsData } from "@/modules/settings/domain/settings.types";

import {
  toSettingsCreateInput,
  toSettingsDomain,
  toSettingsUpdateInput,
} from "../mappers/settings.persistence.mapper";

const MODEL = "CompanySetting";

export class PrismaSettingsRepository implements ISettingsRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findActive(): Promise<Settings | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.companySetting.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
        }),
      { model: MODEL, operation: "findActive" },
    ).then((record) => (record ? toSettingsDomain(record) : null));
  }

  async ensureExists(): Promise<Settings> {
    const settings = await this.findActive();

    if (settings === null) {
      throw new SettingsNotFoundError();
    }

    return settings;
  }

  createDefault(data: CreateSettingsData): Promise<Settings> {
    return repositoryCreate(
      this.runner,
      (db) =>
        db.companySetting.create({
          data: toSettingsCreateInput(data),
        }),
      { model: MODEL, operation: "createDefault" },
    ).then(toSettingsDomain);
  }

  update(id: CompanySettingId, data: UpdateSettingsData): Promise<Settings> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.companySetting.update({
          where: { id },
          data: toSettingsUpdateInput(data),
        }),
      { model: MODEL, operation: "update" },
    ).then(toSettingsDomain);
  }
}
