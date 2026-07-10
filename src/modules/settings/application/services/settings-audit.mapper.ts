import type { Settings } from "@/modules/settings/domain/settings.entity";
import type { SystemSettings } from "@/modules/settings/domain/system-settings.entity";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

export function toCompanySettingsAuditValues(settings: Settings): AuditValues {
  const props = settings.toProps();

  return {
    id: props.id,
    companyName: props.companyName,
    businessName: props.businessName,
    ownerName: props.ownerName,
    phone: props.phone,
    secondaryPhone: props.secondaryPhone,
    email: props.email,
    website: props.website,
    address: props.address,
    city: props.city,
    province: props.province,
    country: props.country,
    postalCode: props.postalCode,
    ntn: props.ntn,
    strn: props.strn,
    logoUrl: props.logoUrl,
    faviconUrl: props.faviconUrl,
    currencyCode: props.currencyCode,
    currencySymbol: props.currencySymbol,
    timezone: props.timezone,
    language: props.language,
    dateFormat: props.dateFormat,
    timeFormat: props.timeFormat,
    numberFormat: props.numberFormat,
    defaultRentalDays: props.defaultRentalDays,
    defaultTaxPercentage: props.defaultTaxPercentage,
    fiscalYearStartMonth: props.fiscalYearStartMonth,
    securityDepositEnabled: props.securityDepositEnabled,
    lateFeeEnabled: props.lateFeeEnabled,
    isActive: props.isActive,
    setupCompleted: props.setupCompleted,
    maintenanceMode: props.maintenanceMode,
  };
}

export function toSystemSettingsAuditValues(
  settings: SystemSettings,
): AuditValues {
  const props = settings.toProps();

  return {
    id: props.id,
    appName: props.appName,
    appVersion: props.appVersion,
    environment: props.environment,
    supportEmail: props.supportEmail,
    supportPhone: props.supportPhone,
    minPasswordLength: props.minPasswordLength,
    maxLoginAttempts: props.maxLoginAttempts,
    lockoutDurationMinutes: props.lockoutDurationMinutes,
    requireEmailVerification: props.requireEmailVerification,
    allowPasswordReset: props.allowPasswordReset,
    sessionTimeoutMinutes: props.sessionTimeoutMinutes,
    rememberMeDurationDays: props.rememberMeDurationDays,
    maxConcurrentSessions: props.maxConcurrentSessions,
    passwordExpiryDays: props.passwordExpiryDays,
    ipWhitelistEnabled: props.ipWhitelistEnabled,
    auditLogRetentionDays: props.auditLogRetentionDays,
    maxUploadSizeMb: props.maxUploadSizeMb,
    allowedFileTypes: props.allowedFileTypes,
    uploadStoragePath: props.uploadStoragePath,
    emailNotificationsEnabled: props.emailNotificationsEnabled,
    smsNotificationsEnabled: props.smsNotificationsEnabled,
    defaultNotificationEmail: props.defaultNotificationEmail,
    backupEnabled: props.backupEnabled,
    backupFrequency: props.backupFrequency,
    backupRetentionDays: props.backupRetentionDays,
    lastBackupAt: props.lastBackupAt?.toISOString() ?? null,
    defaultDashboardView: props.defaultDashboardView,
    recentItemsLimit: props.recentItemsLimit,
    chartDefaultPeriodDays: props.chartDefaultPeriodDays,
  };
}
