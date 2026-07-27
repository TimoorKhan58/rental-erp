import { describe, expect, it, vi } from "vitest";

import { BOOTSTRAP_COMPANY_SETTINGS } from "@/modules/settings/domain/settings.constants";
import { Settings } from "@/modules/settings/domain/settings.entity";
import { SystemSettings } from "@/modules/settings/domain/system-settings.entity";
import type { ISettingsRepository } from "@/modules/settings/domain/settings.repository.interface";
import type { ISystemSettingsRepository } from "@/modules/settings/domain/system-settings.repository.interface";
import type { CompanySettingId, SystemSettingId } from "@/shared/domain/ids";

import { EnsureActiveCompanySettingsService } from "./ensure-active-company-settings.service";
import { GetSettingsService } from "./get-settings.service";

function createCompanySettings() {
  return Settings.reconstitute({
    id: "00000000-0000-4000-8000-000000000101" as CompanySettingId,
    ...Settings.create(BOOTSTRAP_COMPANY_SETTINGS),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function createSystemSettings() {
  return SystemSettings.reconstitute({
    id: "00000000-0000-4000-8000-000000000102" as SystemSettingId,
    ...SystemSettings.create(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe("GetSettingsService", () => {
  it("bootstraps missing company and system settings", async () => {
    const company = createCompanySettings();
    const system = createSystemSettings();

    const settingsRepository: ISettingsRepository = {
      findActive: vi.fn().mockResolvedValue(null),
      ensureExists: vi.fn(),
      createDefault: vi.fn().mockResolvedValue(company),
      update: vi.fn(),
    };

    const systemSettingsRepository: ISystemSettingsRepository = {
      findActive: vi.fn().mockResolvedValue(null),
      createDefault: vi.fn().mockResolvedValue(system),
      update: vi.fn(),
    };

    const ensureActiveCompanySettings = new EnsureActiveCompanySettingsService(
      settingsRepository,
    );

    const service = new GetSettingsService(
      ensureActiveCompanySettings,
      systemSettingsRepository,
    );

    const result = await service.execute();

    expect(settingsRepository.createDefault).toHaveBeenCalledWith(
      BOOTSTRAP_COMPANY_SETTINGS,
    );
    expect(systemSettingsRepository.createDefault).toHaveBeenCalled();
    expect(result.company.companyName).toBe("Your Company");
    expect(result.system.appName).toBeTruthy();
  });
});
