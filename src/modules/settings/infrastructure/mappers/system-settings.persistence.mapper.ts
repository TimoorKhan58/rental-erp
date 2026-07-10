import type { Prisma } from "@/generated/prisma/client";
import { SystemSettings } from "@/modules/settings/domain/system-settings.entity";
import type { UpdateSystemSettingsData } from "@/modules/settings/domain/settings.types";
import type { SystemSettingId } from "@/shared/domain/ids";

export function toSystemSettingsDomain(record: {
  id: string;
  appName: string;
  appVersion: string;
  environment: SystemSettings["environment"];
  supportEmail: string | null;
  supportPhone: string | null;
  minPasswordLength: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  requireEmailVerification: boolean;
  allowPasswordReset: boolean;
  sessionTimeoutMinutes: number;
  rememberMeDurationDays: number;
  maxConcurrentSessions: number;
  passwordExpiryDays: number | null;
  ipWhitelistEnabled: boolean;
  auditLogRetentionDays: number;
  maxUploadSizeMb: number;
  allowedFileTypes: string;
  uploadStoragePath: string | null;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  defaultNotificationEmail: string | null;
  backupEnabled: boolean;
  backupFrequency: SystemSettings["backupFrequency"];
  backupRetentionDays: number;
  lastBackupAt: Date | null;
  defaultDashboardView: string;
  recentItemsLimit: number;
  chartDefaultPeriodDays: number;
  createdAt: Date;
  updatedAt: Date;
}): SystemSettings {
  return SystemSettings.reconstitute({
    id: record.id as SystemSettingId,
    appName: record.appName,
    appVersion: record.appVersion,
    environment: record.environment,
    supportEmail: record.supportEmail,
    supportPhone: record.supportPhone,
    minPasswordLength: record.minPasswordLength,
    maxLoginAttempts: record.maxLoginAttempts,
    lockoutDurationMinutes: record.lockoutDurationMinutes,
    requireEmailVerification: record.requireEmailVerification,
    allowPasswordReset: record.allowPasswordReset,
    sessionTimeoutMinutes: record.sessionTimeoutMinutes,
    rememberMeDurationDays: record.rememberMeDurationDays,
    maxConcurrentSessions: record.maxConcurrentSessions,
    passwordExpiryDays: record.passwordExpiryDays,
    ipWhitelistEnabled: record.ipWhitelistEnabled,
    auditLogRetentionDays: record.auditLogRetentionDays,
    maxUploadSizeMb: record.maxUploadSizeMb,
    allowedFileTypes: record.allowedFileTypes,
    uploadStoragePath: record.uploadStoragePath,
    emailNotificationsEnabled: record.emailNotificationsEnabled,
    smsNotificationsEnabled: record.smsNotificationsEnabled,
    defaultNotificationEmail: record.defaultNotificationEmail,
    backupEnabled: record.backupEnabled,
    backupFrequency: record.backupFrequency,
    backupRetentionDays: record.backupRetentionDays,
    lastBackupAt: record.lastBackupAt,
    defaultDashboardView: record.defaultDashboardView,
    recentItemsLimit: record.recentItemsLimit,
    chartDefaultPeriodDays: record.chartDefaultPeriodDays,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toSystemSettingsUpdateInput(
  data: UpdateSystemSettingsData,
): Prisma.SystemSettingUpdateInput {
  const update: Prisma.SystemSettingUpdateInput = {};

  if (data.appName !== undefined) {
    update.appName = data.appName;
  }

  if (data.appVersion !== undefined) {
    update.appVersion = data.appVersion;
  }

  if (data.environment !== undefined) {
    update.environment = data.environment;
  }

  if (data.supportEmail !== undefined) {
    update.supportEmail = data.supportEmail;
  }

  if (data.supportPhone !== undefined) {
    update.supportPhone = data.supportPhone;
  }

  if (data.minPasswordLength !== undefined) {
    update.minPasswordLength = data.minPasswordLength;
  }

  if (data.maxLoginAttempts !== undefined) {
    update.maxLoginAttempts = data.maxLoginAttempts;
  }

  if (data.lockoutDurationMinutes !== undefined) {
    update.lockoutDurationMinutes = data.lockoutDurationMinutes;
  }

  if (data.requireEmailVerification !== undefined) {
    update.requireEmailVerification = data.requireEmailVerification;
  }

  if (data.allowPasswordReset !== undefined) {
    update.allowPasswordReset = data.allowPasswordReset;
  }

  if (data.sessionTimeoutMinutes !== undefined) {
    update.sessionTimeoutMinutes = data.sessionTimeoutMinutes;
  }

  if (data.rememberMeDurationDays !== undefined) {
    update.rememberMeDurationDays = data.rememberMeDurationDays;
  }

  if (data.maxConcurrentSessions !== undefined) {
    update.maxConcurrentSessions = data.maxConcurrentSessions;
  }

  if (data.passwordExpiryDays !== undefined) {
    update.passwordExpiryDays = data.passwordExpiryDays;
  }

  if (data.ipWhitelistEnabled !== undefined) {
    update.ipWhitelistEnabled = data.ipWhitelistEnabled;
  }

  if (data.auditLogRetentionDays !== undefined) {
    update.auditLogRetentionDays = data.auditLogRetentionDays;
  }

  if (data.maxUploadSizeMb !== undefined) {
    update.maxUploadSizeMb = data.maxUploadSizeMb;
  }

  if (data.allowedFileTypes !== undefined) {
    update.allowedFileTypes = data.allowedFileTypes;
  }

  if (data.uploadStoragePath !== undefined) {
    update.uploadStoragePath = data.uploadStoragePath;
  }

  if (data.emailNotificationsEnabled !== undefined) {
    update.emailNotificationsEnabled = data.emailNotificationsEnabled;
  }

  if (data.smsNotificationsEnabled !== undefined) {
    update.smsNotificationsEnabled = data.smsNotificationsEnabled;
  }

  if (data.defaultNotificationEmail !== undefined) {
    update.defaultNotificationEmail = data.defaultNotificationEmail;
  }

  if (data.backupEnabled !== undefined) {
    update.backupEnabled = data.backupEnabled;
  }

  if (data.backupFrequency !== undefined) {
    update.backupFrequency = data.backupFrequency;
  }

  if (data.backupRetentionDays !== undefined) {
    update.backupRetentionDays = data.backupRetentionDays;
  }

  if (data.lastBackupAt !== undefined) {
    update.lastBackupAt = data.lastBackupAt;
  }

  if (data.defaultDashboardView !== undefined) {
    update.defaultDashboardView = data.defaultDashboardView;
  }

  if (data.recentItemsLimit !== undefined) {
    update.recentItemsLimit = data.recentItemsLimit;
  }

  if (data.chartDefaultPeriodDays !== undefined) {
    update.chartDefaultPeriodDays = data.chartDefaultPeriodDays;
  }

  return update;
}
