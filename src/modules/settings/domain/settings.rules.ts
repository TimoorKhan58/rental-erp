import { SettingsInvariantError } from "./settings.errors";
import type {
  CreateSettingsData,
  SettingsProps,
  SystemSettingsProps,
  UpdateSettingsData,
  UpdateSystemSettingsData,
} from "./settings.types";
import { DEFAULT_COMPANY_SETTINGS, DEFAULT_SYSTEM_SETTINGS } from "./settings.constants";

export function validateTaxPercentage(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new SettingsInvariantError(
      "Default tax percentage must be between 0 and 100",
      "defaultTaxPercentage",
    );
  }

  return roundTaxPercentage(value);
}

export function validateFiscalYearStartMonth(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 12) {
    throw new SettingsInvariantError(
      "Fiscal year start month must be between 1 and 12",
      "fiscalYearStartMonth",
    );
  }

  return value;
}

export function validateDefaultRentalDays(value: number): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new SettingsInvariantError(
      "Default rental days must be at least 1",
      "defaultRentalDays",
    );
  }

  return value;
}

export function normalizeCreateSettingsData(
  data: CreateSettingsData,
): Omit<SettingsProps, "id" | "createdAt" | "updatedAt"> {
  return {
    companyName: normalizeRequiredText(data.companyName, "companyName"),
    businessName: normalizeRequiredText(data.businessName, "businessName"),
    ownerName: normalizeOptionalText(data.ownerName),
    phone: normalizeRequiredText(data.phone, "phone"),
    secondaryPhone: normalizeOptionalText(data.secondaryPhone),
    email: normalizeRequiredText(data.email, "email"),
    website: normalizeOptionalText(data.website),
    address: normalizeRequiredText(data.address, "address"),
    city: normalizeRequiredText(data.city, "city"),
    province: normalizeRequiredText(data.province, "province"),
    country: normalizeRequiredText(
      data.country ?? DEFAULT_COMPANY_SETTINGS.country,
      "country",
    ),
    postalCode: normalizeOptionalText(data.postalCode),
    ntn: normalizeOptionalText(data.ntn),
    strn: normalizeOptionalText(data.strn),
    logoUrl: normalizeOptionalText(data.logoUrl),
    faviconUrl: normalizeOptionalText(data.faviconUrl),
    currencyCode: normalizeRequiredText(
      data.currencyCode ?? DEFAULT_COMPANY_SETTINGS.currencyCode,
      "currencyCode",
    ),
    currencySymbol: normalizeRequiredText(
      data.currencySymbol ?? DEFAULT_COMPANY_SETTINGS.currencySymbol,
      "currencySymbol",
    ),
    timezone: normalizeRequiredText(
      data.timezone ?? DEFAULT_COMPANY_SETTINGS.timezone,
      "timezone",
    ),
    language: normalizeRequiredText(
      data.language ?? DEFAULT_COMPANY_SETTINGS.language,
      "language",
    ),
    dateFormat: normalizeRequiredText(
      data.dateFormat ?? DEFAULT_COMPANY_SETTINGS.dateFormat,
      "dateFormat",
    ),
    timeFormat: normalizeRequiredText(
      data.timeFormat ?? DEFAULT_COMPANY_SETTINGS.timeFormat,
      "timeFormat",
    ),
    numberFormat: normalizeRequiredText(
      data.numberFormat ?? DEFAULT_COMPANY_SETTINGS.numberFormat,
      "numberFormat",
    ),
    defaultRentalDays: validateDefaultRentalDays(
      data.defaultRentalDays ?? DEFAULT_COMPANY_SETTINGS.defaultRentalDays,
    ),
    defaultTaxPercentage: validateTaxPercentage(
      data.defaultTaxPercentage ?? DEFAULT_COMPANY_SETTINGS.defaultTaxPercentage,
    ),
    fiscalYearStartMonth: validateFiscalYearStartMonth(
      data.fiscalYearStartMonth ?? DEFAULT_COMPANY_SETTINGS.fiscalYearStartMonth,
    ),
    securityDepositEnabled:
      data.securityDepositEnabled ?? DEFAULT_COMPANY_SETTINGS.securityDepositEnabled,
    lateFeeEnabled: data.lateFeeEnabled ?? DEFAULT_COMPANY_SETTINGS.lateFeeEnabled,
    isActive: data.isActive ?? DEFAULT_COMPANY_SETTINGS.isActive,
    setupCompleted: data.setupCompleted ?? DEFAULT_COMPANY_SETTINGS.setupCompleted,
    maintenanceMode:
      data.maintenanceMode ?? DEFAULT_COMPANY_SETTINGS.maintenanceMode,
  };
}

export function normalizeSettingsProps(props: SettingsProps): SettingsProps {
  return {
    ...props,
    companyName: normalizeRequiredText(props.companyName, "companyName"),
    businessName: normalizeRequiredText(props.businessName, "businessName"),
    ownerName: normalizeOptionalText(props.ownerName),
    phone: normalizeRequiredText(props.phone, "phone"),
    secondaryPhone: normalizeOptionalText(props.secondaryPhone),
    email: normalizeRequiredText(props.email, "email"),
    website: normalizeOptionalText(props.website),
    address: normalizeRequiredText(props.address, "address"),
    city: normalizeRequiredText(props.city, "city"),
    province: normalizeRequiredText(props.province, "province"),
    country: normalizeRequiredText(props.country, "country"),
    postalCode: normalizeOptionalText(props.postalCode),
    ntn: normalizeOptionalText(props.ntn),
    strn: normalizeOptionalText(props.strn),
    logoUrl: normalizeOptionalText(props.logoUrl),
    faviconUrl: normalizeOptionalText(props.faviconUrl),
    currencyCode: normalizeRequiredText(props.currencyCode, "currencyCode"),
    currencySymbol: normalizeRequiredText(props.currencySymbol, "currencySymbol"),
    timezone: normalizeRequiredText(props.timezone, "timezone"),
    language: normalizeRequiredText(props.language, "language"),
    dateFormat: normalizeRequiredText(props.dateFormat, "dateFormat"),
    timeFormat: normalizeRequiredText(props.timeFormat, "timeFormat"),
    numberFormat: normalizeRequiredText(props.numberFormat, "numberFormat"),
    defaultRentalDays: validateDefaultRentalDays(props.defaultRentalDays),
    defaultTaxPercentage: validateTaxPercentage(props.defaultTaxPercentage),
    fiscalYearStartMonth: validateFiscalYearStartMonth(props.fiscalYearStartMonth),
  };
}

export function normalizeUpdateSettingsData(
  data: UpdateSettingsData,
): UpdateSettingsData {
  const normalized: {
    -readonly [K in keyof UpdateSettingsData]: UpdateSettingsData[K];
  } = { ...data };

  if (data.companyName !== undefined) {
    normalized.companyName = normalizeRequiredText(data.companyName, "companyName");
  }

  if (data.businessName !== undefined) {
    normalized.businessName = normalizeRequiredText(data.businessName, "businessName");
  }

  if (data.ownerName !== undefined) {
    normalized.ownerName = normalizeOptionalText(data.ownerName);
  }

  if (data.phone !== undefined) {
    normalized.phone = normalizeRequiredText(data.phone, "phone");
  }

  if (data.secondaryPhone !== undefined) {
    normalized.secondaryPhone = normalizeOptionalText(data.secondaryPhone);
  }

  if (data.email !== undefined) {
    normalized.email = normalizeRequiredText(data.email, "email");
  }

  if (data.website !== undefined) {
    normalized.website = normalizeOptionalText(data.website);
  }

  if (data.address !== undefined) {
    normalized.address = normalizeRequiredText(data.address, "address");
  }

  if (data.city !== undefined) {
    normalized.city = normalizeRequiredText(data.city, "city");
  }

  if (data.province !== undefined) {
    normalized.province = normalizeRequiredText(data.province, "province");
  }

  if (data.country !== undefined) {
    normalized.country = normalizeRequiredText(data.country, "country");
  }

  if (data.postalCode !== undefined) {
    normalized.postalCode = normalizeOptionalText(data.postalCode);
  }

  if (data.ntn !== undefined) {
    normalized.ntn = normalizeOptionalText(data.ntn);
  }

  if (data.strn !== undefined) {
    normalized.strn = normalizeOptionalText(data.strn);
  }

  if (data.logoUrl !== undefined) {
    normalized.logoUrl = normalizeOptionalText(data.logoUrl);
  }

  if (data.faviconUrl !== undefined) {
    normalized.faviconUrl = normalizeOptionalText(data.faviconUrl);
  }

  if (data.currencyCode !== undefined) {
    normalized.currencyCode = normalizeRequiredText(data.currencyCode, "currencyCode");
  }

  if (data.currencySymbol !== undefined) {
    normalized.currencySymbol = normalizeRequiredText(
      data.currencySymbol,
      "currencySymbol",
    );
  }

  if (data.timezone !== undefined) {
    normalized.timezone = normalizeRequiredText(data.timezone, "timezone");
  }

  if (data.language !== undefined) {
    normalized.language = normalizeRequiredText(data.language, "language");
  }

  if (data.dateFormat !== undefined) {
    normalized.dateFormat = normalizeRequiredText(data.dateFormat, "dateFormat");
  }

  if (data.timeFormat !== undefined) {
    normalized.timeFormat = normalizeRequiredText(data.timeFormat, "timeFormat");
  }

  if (data.numberFormat !== undefined) {
    normalized.numberFormat = normalizeRequiredText(data.numberFormat, "numberFormat");
  }

  if (data.defaultRentalDays !== undefined) {
    normalized.defaultRentalDays = validateDefaultRentalDays(data.defaultRentalDays);
  }

  if (data.defaultTaxPercentage !== undefined) {
    normalized.defaultTaxPercentage = validateTaxPercentage(data.defaultTaxPercentage);
  }

  if (data.fiscalYearStartMonth !== undefined) {
    normalized.fiscalYearStartMonth = validateFiscalYearStartMonth(
      data.fiscalYearStartMonth,
    );
  }

  return normalized;
}

export function normalizeSystemSettingsProps(
  props: SystemSettingsProps,
): SystemSettingsProps {
  return {
    ...props,
    appName: normalizeRequiredText(props.appName, "appName"),
    appVersion: normalizeRequiredText(props.appVersion, "appVersion"),
    supportEmail: normalizeOptionalText(props.supportEmail),
    supportPhone: normalizeOptionalText(props.supportPhone),
    allowedFileTypes: normalizeRequiredText(
      props.allowedFileTypes,
      "allowedFileTypes",
    ),
    uploadStoragePath: normalizeOptionalText(props.uploadStoragePath),
    defaultNotificationEmail: normalizeOptionalText(props.defaultNotificationEmail),
    defaultDashboardView: normalizeRequiredText(
      props.defaultDashboardView,
      "defaultDashboardView",
    ),
    minPasswordLength: validatePositiveInteger(
      props.minPasswordLength,
      "minPasswordLength",
    ),
    maxLoginAttempts: validatePositiveInteger(
      props.maxLoginAttempts,
      "maxLoginAttempts",
    ),
    lockoutDurationMinutes: validateNonNegativeInteger(
      props.lockoutDurationMinutes,
      "lockoutDurationMinutes",
    ),
    sessionTimeoutMinutes: validatePositiveInteger(
      props.sessionTimeoutMinutes,
      "sessionTimeoutMinutes",
    ),
    rememberMeDurationDays: validatePositiveInteger(
      props.rememberMeDurationDays,
      "rememberMeDurationDays",
    ),
    maxConcurrentSessions: validatePositiveInteger(
      props.maxConcurrentSessions,
      "maxConcurrentSessions",
    ),
    auditLogRetentionDays: validatePositiveInteger(
      props.auditLogRetentionDays,
      "auditLogRetentionDays",
    ),
    maxUploadSizeMb: validatePositiveInteger(
      props.maxUploadSizeMb,
      "maxUploadSizeMb",
    ),
    backupRetentionDays: validatePositiveInteger(
      props.backupRetentionDays,
      "backupRetentionDays",
    ),
    recentItemsLimit: validatePositiveInteger(
      props.recentItemsLimit,
      "recentItemsLimit",
    ),
    chartDefaultPeriodDays: validatePositiveInteger(
      props.chartDefaultPeriodDays,
      "chartDefaultPeriodDays",
    ),
    passwordExpiryDays:
      props.passwordExpiryDays === null
        ? null
        : validatePositiveInteger(props.passwordExpiryDays, "passwordExpiryDays"),
  };
}

export function normalizeUpdateSystemSettingsData(
  data: UpdateSystemSettingsData,
): UpdateSystemSettingsData {
  const normalized: {
    -readonly [K in keyof UpdateSystemSettingsData]: UpdateSystemSettingsData[K];
  } = { ...data };

  if (data.appName !== undefined) {
    normalized.appName = normalizeRequiredText(data.appName, "appName");
  }

  if (data.appVersion !== undefined) {
    normalized.appVersion = normalizeRequiredText(data.appVersion, "appVersion");
  }

  if (data.supportEmail !== undefined) {
    normalized.supportEmail = normalizeOptionalText(data.supportEmail);
  }

  if (data.supportPhone !== undefined) {
    normalized.supportPhone = normalizeOptionalText(data.supportPhone);
  }

  if (data.allowedFileTypes !== undefined) {
    normalized.allowedFileTypes = normalizeRequiredText(
      data.allowedFileTypes,
      "allowedFileTypes",
    );
  }

  if (data.uploadStoragePath !== undefined) {
    normalized.uploadStoragePath = normalizeOptionalText(data.uploadStoragePath);
  }

  if (data.defaultNotificationEmail !== undefined) {
    normalized.defaultNotificationEmail = normalizeOptionalText(
      data.defaultNotificationEmail,
    );
  }

  if (data.defaultDashboardView !== undefined) {
    normalized.defaultDashboardView = normalizeRequiredText(
      data.defaultDashboardView,
      "defaultDashboardView",
    );
  }

  if (data.minPasswordLength !== undefined) {
    normalized.minPasswordLength = validatePositiveInteger(
      data.minPasswordLength,
      "minPasswordLength",
    );
  }

  if (data.maxLoginAttempts !== undefined) {
    normalized.maxLoginAttempts = validatePositiveInteger(
      data.maxLoginAttempts,
      "maxLoginAttempts",
    );
  }

  if (data.lockoutDurationMinutes !== undefined) {
    normalized.lockoutDurationMinutes = validateNonNegativeInteger(
      data.lockoutDurationMinutes,
      "lockoutDurationMinutes",
    );
  }

  if (data.sessionTimeoutMinutes !== undefined) {
    normalized.sessionTimeoutMinutes = validatePositiveInteger(
      data.sessionTimeoutMinutes,
      "sessionTimeoutMinutes",
    );
  }

  if (data.rememberMeDurationDays !== undefined) {
    normalized.rememberMeDurationDays = validatePositiveInteger(
      data.rememberMeDurationDays,
      "rememberMeDurationDays",
    );
  }

  if (data.maxConcurrentSessions !== undefined) {
    normalized.maxConcurrentSessions = validatePositiveInteger(
      data.maxConcurrentSessions,
      "maxConcurrentSessions",
    );
  }

  if (data.auditLogRetentionDays !== undefined) {
    normalized.auditLogRetentionDays = validatePositiveInteger(
      data.auditLogRetentionDays,
      "auditLogRetentionDays",
    );
  }

  if (data.maxUploadSizeMb !== undefined) {
    normalized.maxUploadSizeMb = validatePositiveInteger(
      data.maxUploadSizeMb,
      "maxUploadSizeMb",
    );
  }

  if (data.backupRetentionDays !== undefined) {
    normalized.backupRetentionDays = validatePositiveInteger(
      data.backupRetentionDays,
      "backupRetentionDays",
    );
  }

  if (data.recentItemsLimit !== undefined) {
    normalized.recentItemsLimit = validatePositiveInteger(
      data.recentItemsLimit,
      "recentItemsLimit",
    );
  }

  if (data.chartDefaultPeriodDays !== undefined) {
    normalized.chartDefaultPeriodDays = validatePositiveInteger(
      data.chartDefaultPeriodDays,
      "chartDefaultPeriodDays",
    );
  }

  if (data.passwordExpiryDays !== undefined && data.passwordExpiryDays !== null) {
    normalized.passwordExpiryDays = validatePositiveInteger(
      data.passwordExpiryDays,
      "passwordExpiryDays",
    );
  }

  return normalized;
}

export function createDefaultSystemSettingsProps(): Omit<
  SystemSettingsProps,
  "id" | "createdAt" | "updatedAt"
> {
  return {
    appName: DEFAULT_SYSTEM_SETTINGS.appName,
    appVersion: DEFAULT_SYSTEM_SETTINGS.appVersion,
    environment: DEFAULT_SYSTEM_SETTINGS.environment,
    supportEmail: null,
    supportPhone: null,
    minPasswordLength: DEFAULT_SYSTEM_SETTINGS.minPasswordLength,
    maxLoginAttempts: DEFAULT_SYSTEM_SETTINGS.maxLoginAttempts,
    lockoutDurationMinutes: DEFAULT_SYSTEM_SETTINGS.lockoutDurationMinutes,
    requireEmailVerification: DEFAULT_SYSTEM_SETTINGS.requireEmailVerification,
    allowPasswordReset: DEFAULT_SYSTEM_SETTINGS.allowPasswordReset,
    sessionTimeoutMinutes: DEFAULT_SYSTEM_SETTINGS.sessionTimeoutMinutes,
    rememberMeDurationDays: DEFAULT_SYSTEM_SETTINGS.rememberMeDurationDays,
    maxConcurrentSessions: DEFAULT_SYSTEM_SETTINGS.maxConcurrentSessions,
    passwordExpiryDays: null,
    ipWhitelistEnabled: DEFAULT_SYSTEM_SETTINGS.ipWhitelistEnabled,
    auditLogRetentionDays: DEFAULT_SYSTEM_SETTINGS.auditLogRetentionDays,
    maxUploadSizeMb: DEFAULT_SYSTEM_SETTINGS.maxUploadSizeMb,
    allowedFileTypes: DEFAULT_SYSTEM_SETTINGS.allowedFileTypes,
    uploadStoragePath: null,
    emailNotificationsEnabled: DEFAULT_SYSTEM_SETTINGS.emailNotificationsEnabled,
    smsNotificationsEnabled: DEFAULT_SYSTEM_SETTINGS.smsNotificationsEnabled,
    defaultNotificationEmail: null,
    backupEnabled: DEFAULT_SYSTEM_SETTINGS.backupEnabled,
    backupFrequency: DEFAULT_SYSTEM_SETTINGS.backupFrequency,
    backupRetentionDays: DEFAULT_SYSTEM_SETTINGS.backupRetentionDays,
    lastBackupAt: null,
    defaultDashboardView: DEFAULT_SYSTEM_SETTINGS.defaultDashboardView,
    recentItemsLimit: DEFAULT_SYSTEM_SETTINGS.recentItemsLimit,
    chartDefaultPeriodDays: DEFAULT_SYSTEM_SETTINGS.chartDefaultPeriodDays,
  };
}

function normalizeRequiredText(value: string, field: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new SettingsInvariantError(`${field} is required`, field);
  }

  return trimmed;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validatePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new SettingsInvariantError(`${field} must be a positive integer`, field);
  }

  return value;
}

function validateNonNegativeInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new SettingsInvariantError(`${field} must be a non-negative integer`, field);
  }

  return value;
}

function roundTaxPercentage(value: number): number {
  return Math.round(value * 100) / 100;
}
