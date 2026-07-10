import type { ISettingsRepository } from "@/modules/settings/domain/settings.repository.interface";
import type { ISystemSettingsRepository } from "@/modules/settings/domain/system-settings.repository.interface";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { SettingsProfileDto } from "../dtos/settings.dto";
import { toSettingsProfileDto } from "../mappers/settings.mapper";

export class GetSettingsService {
  constructor(
    private readonly settingsRepository: ISettingsRepository,
    private readonly systemSettingsRepository: ISystemSettingsRepository,
  ) {}

  async execute(): Promise<SettingsProfileDto> {
    const [company, system] = await Promise.all([
      this.settingsRepository.findActive(),
      this.systemSettingsRepository.findActive(),
    ]);

    if (company === null) {
      throw new NotFoundError({
        message: "Company settings not found",
      });
    }

    if (system === null) {
      throw new NotFoundError({
        message: "System settings not found",
      });
    }

    return toSettingsProfileDto(company, system);
  }
}
