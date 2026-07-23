import type { ISettingsRepository } from "@/modules/settings/domain/settings.repository.interface";
import type { ISystemSettingsRepository } from "@/modules/settings/domain/system-settings.repository.interface";
import { BOOTSTRAP_COMPANY_SETTINGS } from "@/modules/settings/domain/settings.constants";

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

    const resolvedCompany =
      company ??
      (await this.settingsRepository.createDefault(BOOTSTRAP_COMPANY_SETTINGS));

    const resolvedSystem =
      system ?? (await this.systemSettingsRepository.createDefault());

    return toSettingsProfileDto(resolvedCompany, resolvedSystem);
  }
}
