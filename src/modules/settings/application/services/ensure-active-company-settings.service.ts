import { BOOTSTRAP_COMPANY_SETTINGS } from "@/modules/settings/domain/settings.constants";
import type { Settings } from "@/modules/settings/domain/settings.entity";
import type { ISettingsRepository } from "@/modules/settings/domain/settings.repository.interface";

/**
 * Idempotent first-run bootstrap for company_settings.
 * Safe to call from any code path that depends on an active company profile.
 */
export class EnsureActiveCompanySettingsService {
  constructor(private readonly settingsRepository: ISettingsRepository) {}

  async execute(): Promise<Settings> {
    const existing = await this.settingsRepository.findActive();

    if (existing !== null) {
      return existing;
    }

    try {
      return await this.settingsRepository.createDefault(
        BOOTSTRAP_COMPANY_SETTINGS,
      );
    } catch {
      const created = await this.settingsRepository.findActive();

      if (created !== null) {
        return created;
      }

      throw new Error("Failed to bootstrap company settings");
    }
  }
}
