import type { ISettingsRepository } from "@/modules/settings/domain/settings.repository.interface";
import type { ISystemSettingsRepository } from "@/modules/settings/domain/system-settings.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface SettingsWriteScope {
  readonly settingsRepository: ISettingsRepository;
  readonly systemSettingsRepository: ISystemSettingsRepository;
  readonly auditLogger: IAuditLogger;
}

export interface ISettingsTransactionRunner {
  run<T>(operation: (scope: SettingsWriteScope) => Promise<T>): Promise<T>;
}
