import { describe, expect, it, vi } from "vitest";

import { MockAuditLogger } from "@/modules/customer/tests/helpers/mock-audit-logger";
import { APPLICATION } from "@/constants/application";
import { BOOTSTRAP_COMPANY_SETTINGS } from "@/modules/settings/domain/settings.constants";
import { Settings } from "@/modules/settings/domain/settings.entity";
import { SystemSettings } from "@/modules/settings/domain/system-settings.entity";
import type { ISettingsRepository } from "@/modules/settings/domain/settings.repository.interface";
import type { ISystemSettingsRepository } from "@/modules/settings/domain/system-settings.repository.interface";
import type { CompanySettingId, SystemSettingId } from "@/shared/domain/ids";
import { ValidationError } from "@/shared/infrastructure/errors";

import { UpdateSettingsService } from "./update-settings.service";
import type {
  ISettingsTransactionRunner,
  SettingsWriteScope,
} from "./settings-transaction.runner";

function createCompanySettings() {
  return Settings.reconstitute({
    id: "00000000-0000-4000-8000-000000000101" as CompanySettingId,
    ...Settings.create(BOOTSTRAP_COMPANY_SETTINGS),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function createSystemSettings(appName = APPLICATION.name) {
  return SystemSettings.reconstitute({
    id: "00000000-0000-4000-8000-000000000102" as SystemSettingId,
    ...SystemSettings.create(),
    appName,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function createPassThroughSettingsRunner(
  scope: SettingsWriteScope,
): ISettingsTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

describe("UpdateSettingsService", () => {
  it("persists permitted company name updates", async () => {
    const company = createCompanySettings();
    const system = createSystemSettings();
    const auditLogger = new MockAuditLogger();

    const settingsRepository: ISettingsRepository = {
      findActive: vi.fn().mockResolvedValue(company),
      ensureExists: vi.fn(),
      createDefault: vi.fn(),
      update: vi.fn().mockImplementation(async (_id, data) =>
        company.withUpdated(data),
      ),
    };

    const systemSettingsRepository: ISystemSettingsRepository = {
      findActive: vi.fn().mockResolvedValue(system),
      createDefault: vi.fn(),
      update: vi.fn(),
    };

    const service = new UpdateSettingsService(
      createPassThroughSettingsRunner({
        settingsRepository,
        systemSettingsRepository,
        auditLogger,
      }),
    );

    const result = await service.execute({
      company: { companyName: "Acme Rentals" },
    });

    expect(result.company.companyName).toBe("Acme Rentals");
    expect(settingsRepository.update).toHaveBeenCalled();
  });

  it("rejects invalid default tax percentage", async () => {
    const company = createCompanySettings();
    const system = createSystemSettings();
    const auditLogger = new MockAuditLogger();

    const settingsRepository: ISettingsRepository = {
      findActive: vi.fn().mockResolvedValue(company),
      ensureExists: vi.fn(),
      createDefault: vi.fn(),
      update: vi.fn(),
    };

    const systemSettingsRepository: ISystemSettingsRepository = {
      findActive: vi.fn().mockResolvedValue(system),
      createDefault: vi.fn(),
      update: vi.fn(),
    };

    const service = new UpdateSettingsService(
      createPassThroughSettingsRunner({
        settingsRepository,
        systemSettingsRepository,
        auditLogger,
      }),
    );

    await expect(
      service.execute({ company: { defaultTaxPercentage: 150 } }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("updates system app name without migrating stored defaults implicitly", async () => {
    const company = createCompanySettings();
    const legacySystem = createSystemSettings("Legacy ERP Name");
    const auditLogger = new MockAuditLogger();

    const settingsRepository: ISettingsRepository = {
      findActive: vi.fn().mockResolvedValue(company),
      ensureExists: vi.fn(),
      createDefault: vi.fn(),
      update: vi.fn(),
    };

    const systemSettingsRepository: ISystemSettingsRepository = {
      findActive: vi.fn().mockResolvedValue(legacySystem),
      createDefault: vi.fn(),
      update: vi.fn().mockImplementation(async (_id, data) =>
        legacySystem.withUpdated(data),
      ),
    };

    const service = new UpdateSettingsService(
      createPassThroughSettingsRunner({
        settingsRepository,
        systemSettingsRepository,
        auditLogger,
      }),
    );

    const result = await service.execute({
      system: { appName: "RentCore" },
    });

    expect(result.system.appName).toBe("RentCore");
    expect(systemSettingsRepository.update).toHaveBeenCalled();
  });
});
