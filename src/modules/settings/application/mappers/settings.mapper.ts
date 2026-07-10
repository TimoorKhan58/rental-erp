import type { Settings } from "@/modules/settings/domain/settings.entity";
import type { SystemSettings } from "@/modules/settings/domain/system-settings.entity";
import type {
  FeatureFlagProps,
  UpdateSettingsData,
  UpdateSystemSettingsData,
} from "@/modules/settings/domain/settings.types";

import type {
  CompanySettingsDto,
  FeatureFlagDto,
  SettingsProfileDto,
  SystemSettingsDto,
} from "../dtos/settings.dto";
import type { UpdateSettingsInput } from "../schemas/settings.schemas";

export function toCompanySettingsDto(settings: Settings): CompanySettingsDto {
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
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toFeatureFlagDto(flag: FeatureFlagProps): FeatureFlagDto {
  return {
    id: flag.id,
    featureKey: flag.featureKey,
    displayName: flag.displayName,
    enabled: flag.enabled,
    description: flag.description,
    createdAt: flag.createdAt.toISOString(),
    updatedAt: flag.updatedAt.toISOString(),
  };
}

export function toSystemSettingsDto(
  settings: SystemSettings,
  featureFlags: FeatureFlagProps[] = [],
): SystemSettingsDto {
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
    featureFlags: featureFlags.map(toFeatureFlagDto),
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toSettingsProfileDto(
  company: Settings,
  system: SystemSettings,
  featureFlags: FeatureFlagProps[] = [],
): SettingsProfileDto {
  return {
    company: toCompanySettingsDto(company),
    system: toSystemSettingsDto(system, featureFlags),
  };
}

export function toUpdateSettingsData(
  input: NonNullable<UpdateSettingsInput["company"]>,
): UpdateSettingsData {
  return {
    companyName: input.companyName,
    businessName: input.businessName,
    ownerName: input.ownerName,
    phone: input.phone,
    secondaryPhone: input.secondaryPhone,
    email: input.email,
    website: input.website,
    address: input.address,
    city: input.city,
    province: input.province,
    country: input.country,
    postalCode: input.postalCode,
    ntn: input.ntn,
    strn: input.strn,
    logoUrl: input.logoUrl,
    faviconUrl: input.faviconUrl,
    currencyCode: input.currencyCode,
    currencySymbol: input.currencySymbol,
    timezone: input.timezone,
    language: input.language,
    dateFormat: input.dateFormat,
    timeFormat: input.timeFormat,
    numberFormat: input.numberFormat,
    defaultRentalDays: input.defaultRentalDays,
    defaultTaxPercentage: input.defaultTaxPercentage,
    fiscalYearStartMonth: input.fiscalYearStartMonth,
    securityDepositEnabled: input.securityDepositEnabled,
    lateFeeEnabled: input.lateFeeEnabled,
    isActive: input.isActive,
    setupCompleted: input.setupCompleted,
    maintenanceMode: input.maintenanceMode,
  };
}

export function toUpdateSystemSettingsData(
  input: NonNullable<UpdateSettingsInput["system"]>,
): UpdateSystemSettingsData {
  return {
    appName: input.appName,
    appVersion: input.appVersion,
    environment: input.environment,
    supportEmail: input.supportEmail,
    supportPhone: input.supportPhone,
    minPasswordLength: input.minPasswordLength,
    maxLoginAttempts: input.maxLoginAttempts,
    lockoutDurationMinutes: input.lockoutDurationMinutes,
    requireEmailVerification: input.requireEmailVerification,
    allowPasswordReset: input.allowPasswordReset,
    sessionTimeoutMinutes: input.sessionTimeoutMinutes,
    rememberMeDurationDays: input.rememberMeDurationDays,
    maxConcurrentSessions: input.maxConcurrentSessions,
    passwordExpiryDays: input.passwordExpiryDays,
    ipWhitelistEnabled: input.ipWhitelistEnabled,
    auditLogRetentionDays: input.auditLogRetentionDays,
    maxUploadSizeMb: input.maxUploadSizeMb,
    allowedFileTypes: input.allowedFileTypes,
    uploadStoragePath: input.uploadStoragePath,
    emailNotificationsEnabled: input.emailNotificationsEnabled,
    smsNotificationsEnabled: input.smsNotificationsEnabled,
    defaultNotificationEmail: input.defaultNotificationEmail,
    backupEnabled: input.backupEnabled,
    backupFrequency: input.backupFrequency,
    backupRetentionDays: input.backupRetentionDays,
    lastBackupAt: input.lastBackupAt,
    defaultDashboardView: input.defaultDashboardView,
    recentItemsLimit: input.recentItemsLimit,
    chartDefaultPeriodDays: input.chartDefaultPeriodDays,
  };
}
