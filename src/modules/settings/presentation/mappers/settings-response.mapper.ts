import type {
  CompanySettingsDto,
  FeatureFlagDto,
  SettingsProfileDto,
  SystemSettingsDto,
} from "@/modules/settings/application/dtos/settings.dto";

export interface CompanySettingsResponse {
  id: string;
  companyName: string;
  businessName: string;
  ownerName: string | null;
  phone: string;
  secondaryPhone: string | null;
  email: string;
  website: string | null;
  address: string;
  city: string;
  province: string;
  country: string;
  postalCode: string | null;
  ntn: string | null;
  strn: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  currencyCode: string;
  currencySymbol: string;
  timezone: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  defaultRentalDays: number;
  defaultTaxPercentage: number;
  fiscalYearStartMonth: number;
  securityDepositEnabled: boolean;
  lateFeeEnabled: boolean;
  isActive: boolean;
  setupCompleted: boolean;
  maintenanceMode: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlagResponse {
  id: string;
  featureKey: string;
  displayName: string;
  enabled: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettingsResponse {
  id: string;
  appName: string;
  appVersion: string;
  environment: SystemSettingsDto["environment"];
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
  backupFrequency: SystemSettingsDto["backupFrequency"];
  backupRetentionDays: number;
  lastBackupAt: string | null;
  defaultDashboardView: string;
  recentItemsLimit: number;
  chartDefaultPeriodDays: number;
  featureFlags: FeatureFlagResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface SettingsProfileResponse {
  company: CompanySettingsResponse;
  system: SystemSettingsResponse;
}

export function toFeatureFlagResponse(dto: FeatureFlagDto): FeatureFlagResponse {
  return {
    id: dto.id,
    featureKey: dto.featureKey,
    displayName: dto.displayName,
    enabled: dto.enabled,
    description: dto.description,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toCompanySettingsResponse(
  dto: CompanySettingsDto,
): CompanySettingsResponse {
  return {
    id: dto.id,
    companyName: dto.companyName,
    businessName: dto.businessName,
    ownerName: dto.ownerName,
    phone: dto.phone,
    secondaryPhone: dto.secondaryPhone,
    email: dto.email,
    website: dto.website,
    address: dto.address,
    city: dto.city,
    province: dto.province,
    country: dto.country,
    postalCode: dto.postalCode,
    ntn: dto.ntn,
    strn: dto.strn,
    logoUrl: dto.logoUrl,
    faviconUrl: dto.faviconUrl,
    currencyCode: dto.currencyCode,
    currencySymbol: dto.currencySymbol,
    timezone: dto.timezone,
    language: dto.language,
    dateFormat: dto.dateFormat,
    timeFormat: dto.timeFormat,
    numberFormat: dto.numberFormat,
    defaultRentalDays: dto.defaultRentalDays,
    defaultTaxPercentage: dto.defaultTaxPercentage,
    fiscalYearStartMonth: dto.fiscalYearStartMonth,
    securityDepositEnabled: dto.securityDepositEnabled,
    lateFeeEnabled: dto.lateFeeEnabled,
    isActive: dto.isActive,
    setupCompleted: dto.setupCompleted,
    maintenanceMode: dto.maintenanceMode,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toSystemSettingsResponse(
  dto: SystemSettingsDto,
): SystemSettingsResponse {
  return {
    id: dto.id,
    appName: dto.appName,
    appVersion: dto.appVersion,
    environment: dto.environment,
    supportEmail: dto.supportEmail,
    supportPhone: dto.supportPhone,
    minPasswordLength: dto.minPasswordLength,
    maxLoginAttempts: dto.maxLoginAttempts,
    lockoutDurationMinutes: dto.lockoutDurationMinutes,
    requireEmailVerification: dto.requireEmailVerification,
    allowPasswordReset: dto.allowPasswordReset,
    sessionTimeoutMinutes: dto.sessionTimeoutMinutes,
    rememberMeDurationDays: dto.rememberMeDurationDays,
    maxConcurrentSessions: dto.maxConcurrentSessions,
    passwordExpiryDays: dto.passwordExpiryDays,
    ipWhitelistEnabled: dto.ipWhitelistEnabled,
    auditLogRetentionDays: dto.auditLogRetentionDays,
    maxUploadSizeMb: dto.maxUploadSizeMb,
    allowedFileTypes: dto.allowedFileTypes,
    uploadStoragePath: dto.uploadStoragePath,
    emailNotificationsEnabled: dto.emailNotificationsEnabled,
    smsNotificationsEnabled: dto.smsNotificationsEnabled,
    defaultNotificationEmail: dto.defaultNotificationEmail,
    backupEnabled: dto.backupEnabled,
    backupFrequency: dto.backupFrequency,
    backupRetentionDays: dto.backupRetentionDays,
    lastBackupAt: dto.lastBackupAt,
    defaultDashboardView: dto.defaultDashboardView,
    recentItemsLimit: dto.recentItemsLimit,
    chartDefaultPeriodDays: dto.chartDefaultPeriodDays,
    featureFlags: dto.featureFlags.map(toFeatureFlagResponse),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toSettingsProfileResponse(
  dto: SettingsProfileDto,
): SettingsProfileResponse {
  return {
    company: toCompanySettingsResponse(dto.company),
    system: toSystemSettingsResponse(dto.system),
  };
}
