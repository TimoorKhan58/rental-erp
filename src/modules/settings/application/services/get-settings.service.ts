import type { ISystemSettingsRepository } from "@/modules/settings/domain/system-settings.repository.interface";

import type { SettingsProfileDto } from "../dtos/settings.dto";
import { toSettingsProfileDto } from "../mappers/settings.mapper";
import { EnsureActiveCompanySettingsService } from "./ensure-active-company-settings.service";

export class GetSettingsService {
  constructor(
    private readonly ensureActiveCompanySettings: EnsureActiveCompanySettingsService,
    private readonly systemSettingsRepository: ISystemSettingsRepository,
  ) {}

  async execute(): Promise<SettingsProfileDto> {
    const [resolvedCompany, system] = await Promise.all([
      this.ensureActiveCompanySettings.execute(),
      this.systemSettingsRepository.findActive(),
    ]);

    const resolvedSystem =
      system ?? (await this.systemSettingsRepository.createDefault());

    return toSettingsProfileDto(resolvedCompany, resolvedSystem);
  }
}
