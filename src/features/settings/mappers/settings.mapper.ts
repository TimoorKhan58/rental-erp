import type {
  CompanySettingsResponse,
  SecuritySettingsView,
  SystemSettingsResponse,
  UserPreferencesView,
} from "../types";

export function toUserPreferencesView(
  company: CompanySettingsResponse,
  system: SystemSettingsResponse,
): UserPreferencesView {
  return {
    language: company.language,
    dateFormat: company.dateFormat,
    timeFormat: company.timeFormat,
    numberFormat: company.numberFormat,
    timezone: company.timezone,
    currencyCode: company.currencyCode,
    currencySymbol: company.currencySymbol,
    defaultDashboardView: system.defaultDashboardView,
    recentItemsLimit: system.recentItemsLimit,
    chartDefaultPeriodDays: system.chartDefaultPeriodDays,
  };
}

export function toSecuritySettingsView(
  system: SystemSettingsResponse,
): SecuritySettingsView {
  return {
    minPasswordLength: system.minPasswordLength,
    maxLoginAttempts: system.maxLoginAttempts,
    lockoutDurationMinutes: system.lockoutDurationMinutes,
    requireEmailVerification: system.requireEmailVerification,
    allowPasswordReset: system.allowPasswordReset,
    sessionTimeoutMinutes: system.sessionTimeoutMinutes,
    rememberMeDurationDays: system.rememberMeDurationDays,
    maxConcurrentSessions: system.maxConcurrentSessions,
    passwordExpiryDays: system.passwordExpiryDays,
    ipWhitelistEnabled: system.ipWhitelistEnabled,
    appName: system.appName,
    appVersion: system.appVersion,
    environment: system.environment,
  };
}

export const ENVIRONMENT_LABELS: Record<string, string> = {
  DEVELOPMENT: "Development",
  STAGING: "Staging",
  PRODUCTION: "Production",
};

export const BACKUP_FREQUENCY_LABELS: Record<string, string> = {
  HOURLY: "Hourly",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

export function toCompanyUpdatePayload(values: {
  companyName: string;
  businessName: string;
  ownerName?: string | null;
  phone: string;
  secondaryPhone?: string | null;
  email: string;
  website?: string | null;
  address: string;
  city: string;
  province: string;
  country: string;
  postalCode?: string | null;
  ntn?: string | null;
  strn?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
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
}) {
  const emptyToNull = (value: string | null | undefined) => {
    if (value === undefined || value === null || value.trim() === "") {
      return null;
    }
    return value.trim();
  };

  return {
    ...values,
    ownerName: emptyToNull(values.ownerName),
    secondaryPhone: emptyToNull(values.secondaryPhone),
    website: emptyToNull(values.website),
    postalCode: emptyToNull(values.postalCode),
    ntn: emptyToNull(values.ntn),
    strn: emptyToNull(values.strn),
    logoUrl: emptyToNull(values.logoUrl),
    faviconUrl: emptyToNull(values.faviconUrl),
  };
}
