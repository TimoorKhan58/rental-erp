import { describe, expect, it, vi } from "vitest";

import { BOOTSTRAP_COMPANY_SETTINGS } from "@/modules/settings/domain/settings.constants";
import { Settings } from "@/modules/settings/domain/settings.entity";
import type { ISettingsRepository } from "@/modules/settings/domain/settings.repository.interface";
import type { CompanySettingId } from "@/shared/domain/ids";

import { EnsureActiveCompanySettingsService } from "./ensure-active-company-settings.service";

function createCompanySettings() {
  return Settings.reconstitute({
    id: "00000000-0000-4000-8000-000000000101" as CompanySettingId,
    ...Settings.create(BOOTSTRAP_COMPANY_SETTINGS),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe("EnsureActiveCompanySettingsService", () => {
  it("returns existing active company settings", async () => {
    const company = createCompanySettings();
    const settingsRepository: ISettingsRepository = {
      findActive: vi.fn().mockResolvedValue(company),
      ensureExists: vi.fn(),
      createDefault: vi.fn(),
      update: vi.fn(),
    };

    const service = new EnsureActiveCompanySettingsService(settingsRepository);
    const result = await service.execute();

    expect(result).toBe(company);
    expect(settingsRepository.createDefault).not.toHaveBeenCalled();
  });

  it("bootstraps company settings when missing", async () => {
    const company = createCompanySettings();
    const settingsRepository: ISettingsRepository = {
      findActive: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null),
      ensureExists: vi.fn(),
      createDefault: vi.fn().mockResolvedValue(company),
      update: vi.fn(),
    };

    const service = new EnsureActiveCompanySettingsService(settingsRepository);
    const result = await service.execute();

    expect(settingsRepository.createDefault).toHaveBeenCalledWith(
      BOOTSTRAP_COMPANY_SETTINGS,
    );
    expect(result.companyName).toBe("Your Company");
  });

  it("retries findActive when create races with another bootstrap", async () => {
    const company = createCompanySettings();
    const settingsRepository: ISettingsRepository = {
      findActive: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(company),
      ensureExists: vi.fn(),
      createDefault: vi.fn().mockRejectedValue(new Error("race")),
      update: vi.fn(),
    };

    const service = new EnsureActiveCompanySettingsService(settingsRepository);
    const result = await service.execute();

    expect(result).toBe(company);
  });
});
