import type { SystemSettingId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import {
  createDefaultSystemSettingsProps,
  normalizeSystemSettingsProps,
  normalizeUpdateSystemSettingsData,
} from "./settings.rules";
import type { SystemSettingsProps, UpdateSystemSettingsData } from "./settings.types";

export class SystemSettings implements Entity<SystemSettingId> {
  readonly id: SystemSettingId;
  readonly appName: string;
  readonly appVersion: string;
  readonly environment: SystemSettingsProps["environment"];
  readonly supportEmail: string | null;
  readonly supportPhone: string | null;
  readonly minPasswordLength: number;
  readonly maxLoginAttempts: number;
  readonly lockoutDurationMinutes: number;
  readonly requireEmailVerification: boolean;
  readonly allowPasswordReset: boolean;
  readonly sessionTimeoutMinutes: number;
  readonly rememberMeDurationDays: number;
  readonly maxConcurrentSessions: number;
  readonly passwordExpiryDays: number | null;
  readonly ipWhitelistEnabled: boolean;
  readonly auditLogRetentionDays: number;
  readonly maxUploadSizeMb: number;
  readonly allowedFileTypes: string;
  readonly uploadStoragePath: string | null;
  readonly emailNotificationsEnabled: boolean;
  readonly smsNotificationsEnabled: boolean;
  readonly defaultNotificationEmail: string | null;
  readonly backupEnabled: boolean;
  readonly backupFrequency: SystemSettingsProps["backupFrequency"];
  readonly backupRetentionDays: number;
  readonly lastBackupAt: Date | null;
  readonly defaultDashboardView: string;
  readonly recentItemsLimit: number;
  readonly chartDefaultPeriodDays: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: SystemSettingsProps) {
    const normalized = normalizeSystemSettingsProps(props);

    this.id = normalized.id;
    this.appName = normalized.appName;
    this.appVersion = normalized.appVersion;
    this.environment = normalized.environment;
    this.supportEmail = normalized.supportEmail;
    this.supportPhone = normalized.supportPhone;
    this.minPasswordLength = normalized.minPasswordLength;
    this.maxLoginAttempts = normalized.maxLoginAttempts;
    this.lockoutDurationMinutes = normalized.lockoutDurationMinutes;
    this.requireEmailVerification = normalized.requireEmailVerification;
    this.allowPasswordReset = normalized.allowPasswordReset;
    this.sessionTimeoutMinutes = normalized.sessionTimeoutMinutes;
    this.rememberMeDurationDays = normalized.rememberMeDurationDays;
    this.maxConcurrentSessions = normalized.maxConcurrentSessions;
    this.passwordExpiryDays = normalized.passwordExpiryDays;
    this.ipWhitelistEnabled = normalized.ipWhitelistEnabled;
    this.auditLogRetentionDays = normalized.auditLogRetentionDays;
    this.maxUploadSizeMb = normalized.maxUploadSizeMb;
    this.allowedFileTypes = normalized.allowedFileTypes;
    this.uploadStoragePath = normalized.uploadStoragePath;
    this.emailNotificationsEnabled = normalized.emailNotificationsEnabled;
    this.smsNotificationsEnabled = normalized.smsNotificationsEnabled;
    this.defaultNotificationEmail = normalized.defaultNotificationEmail;
    this.backupEnabled = normalized.backupEnabled;
    this.backupFrequency = normalized.backupFrequency;
    this.backupRetentionDays = normalized.backupRetentionDays;
    this.lastBackupAt = normalized.lastBackupAt;
    this.defaultDashboardView = normalized.defaultDashboardView;
    this.recentItemsLimit = normalized.recentItemsLimit;
    this.chartDefaultPeriodDays = normalized.chartDefaultPeriodDays;
    this.createdAt = normalized.createdAt;
    this.updatedAt = normalized.updatedAt;
  }

  static create(): Omit<SystemSettingsProps, "id" | "createdAt" | "updatedAt"> {
    return createDefaultSystemSettingsProps();
  }

  static reconstitute(props: SystemSettingsProps): SystemSettings {
    return new SystemSettings(props);
  }

  toProps(): SystemSettingsProps {
    return {
      id: this.id,
      appName: this.appName,
      appVersion: this.appVersion,
      environment: this.environment,
      supportEmail: this.supportEmail,
      supportPhone: this.supportPhone,
      minPasswordLength: this.minPasswordLength,
      maxLoginAttempts: this.maxLoginAttempts,
      lockoutDurationMinutes: this.lockoutDurationMinutes,
      requireEmailVerification: this.requireEmailVerification,
      allowPasswordReset: this.allowPasswordReset,
      sessionTimeoutMinutes: this.sessionTimeoutMinutes,
      rememberMeDurationDays: this.rememberMeDurationDays,
      maxConcurrentSessions: this.maxConcurrentSessions,
      passwordExpiryDays: this.passwordExpiryDays,
      ipWhitelistEnabled: this.ipWhitelistEnabled,
      auditLogRetentionDays: this.auditLogRetentionDays,
      maxUploadSizeMb: this.maxUploadSizeMb,
      allowedFileTypes: this.allowedFileTypes,
      uploadStoragePath: this.uploadStoragePath,
      emailNotificationsEnabled: this.emailNotificationsEnabled,
      smsNotificationsEnabled: this.smsNotificationsEnabled,
      defaultNotificationEmail: this.defaultNotificationEmail,
      backupEnabled: this.backupEnabled,
      backupFrequency: this.backupFrequency,
      backupRetentionDays: this.backupRetentionDays,
      lastBackupAt: this.lastBackupAt,
      defaultDashboardView: this.defaultDashboardView,
      recentItemsLimit: this.recentItemsLimit,
      chartDefaultPeriodDays: this.chartDefaultPeriodDays,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  withUpdated(data: UpdateSystemSettingsData): SystemSettings {
    const normalized = normalizeUpdateSystemSettingsData(data);

    return SystemSettings.reconstitute({
      ...this.toProps(),
      appName: normalized.appName ?? this.appName,
      appVersion: normalized.appVersion ?? this.appVersion,
      environment: normalized.environment ?? this.environment,
      supportEmail:
        normalized.supportEmail !== undefined
          ? normalized.supportEmail
          : this.supportEmail,
      supportPhone:
        normalized.supportPhone !== undefined
          ? normalized.supportPhone
          : this.supportPhone,
      minPasswordLength: normalized.minPasswordLength ?? this.minPasswordLength,
      maxLoginAttempts: normalized.maxLoginAttempts ?? this.maxLoginAttempts,
      lockoutDurationMinutes:
        normalized.lockoutDurationMinutes ?? this.lockoutDurationMinutes,
      requireEmailVerification:
        normalized.requireEmailVerification ?? this.requireEmailVerification,
      allowPasswordReset: normalized.allowPasswordReset ?? this.allowPasswordReset,
      sessionTimeoutMinutes:
        normalized.sessionTimeoutMinutes ?? this.sessionTimeoutMinutes,
      rememberMeDurationDays:
        normalized.rememberMeDurationDays ?? this.rememberMeDurationDays,
      maxConcurrentSessions:
        normalized.maxConcurrentSessions ?? this.maxConcurrentSessions,
      passwordExpiryDays:
        normalized.passwordExpiryDays !== undefined
          ? normalized.passwordExpiryDays
          : this.passwordExpiryDays,
      ipWhitelistEnabled: normalized.ipWhitelistEnabled ?? this.ipWhitelistEnabled,
      auditLogRetentionDays:
        normalized.auditLogRetentionDays ?? this.auditLogRetentionDays,
      maxUploadSizeMb: normalized.maxUploadSizeMb ?? this.maxUploadSizeMb,
      allowedFileTypes: normalized.allowedFileTypes ?? this.allowedFileTypes,
      uploadStoragePath:
        normalized.uploadStoragePath !== undefined
          ? normalized.uploadStoragePath
          : this.uploadStoragePath,
      emailNotificationsEnabled:
        normalized.emailNotificationsEnabled ?? this.emailNotificationsEnabled,
      smsNotificationsEnabled:
        normalized.smsNotificationsEnabled ?? this.smsNotificationsEnabled,
      defaultNotificationEmail:
        normalized.defaultNotificationEmail !== undefined
          ? normalized.defaultNotificationEmail
          : this.defaultNotificationEmail,
      backupEnabled: normalized.backupEnabled ?? this.backupEnabled,
      backupFrequency: normalized.backupFrequency ?? this.backupFrequency,
      backupRetentionDays:
        normalized.backupRetentionDays ?? this.backupRetentionDays,
      lastBackupAt:
        normalized.lastBackupAt !== undefined
          ? normalized.lastBackupAt
          : this.lastBackupAt,
      defaultDashboardView:
        normalized.defaultDashboardView ?? this.defaultDashboardView,
      recentItemsLimit: normalized.recentItemsLimit ?? this.recentItemsLimit,
      chartDefaultPeriodDays:
        normalized.chartDefaultPeriodDays ?? this.chartDefaultPeriodDays,
      updatedAt: new Date(),
    });
  }
}
