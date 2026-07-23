import { describe, expect, it, vi } from "vitest";

import { BOOTSTRAP_COMPANY_SETTINGS } from "@/modules/settings/domain/settings.constants";
import { Settings } from "@/modules/settings/domain/settings.entity";
import { SystemSettings } from "@/modules/settings/domain/system-settings.entity";
import type { ISettingsRepository } from "@/modules/settings/domain/settings.repository.interface";
import type { ISystemSettingsRepository } from "@/modules/settings/domain/system-settings.repository.interface";

import { GetSettingsService } from "./get-settings.service";

function createCompanySettings() {
  return Settings.reconstitute({
    id: "cs000001-0000-4000-8000-000000000001",
    ...Settings.create(BOOTSTRAP_COMPANY_SETTINGS),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function createSystemSettings() {
  return SystemSettings.reconstitute({
    id: "ss000001-0000-4000-8000-000000000001",
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

    const service = new GetSettingsService(
      settingsRepository,
      systemSettingsRepository,
    );

    const result = await service.execute();

    expect(settingsRepository.createDefault).toHaveBeenCalledWith(
      BOOTSTRAP_COMPANY_SETTINGS,
    );
    expect(systemSettingsRepository.createDefault).toHaveBeenCalled();
    expect(result.company.companyName).toBe("Manyar Tent Service");
    expect(result.system.appName).toBeTruthy();
  });
});
