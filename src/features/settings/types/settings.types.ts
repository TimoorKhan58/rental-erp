export type Environment = "DEVELOPMENT" | "STAGING" | "PRODUCTION";
export type BackupFrequency = "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY";

export type CompanySettingsResponse = {
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
};

export type SystemSettingsResponse = {
  id: string;
  appName: string;
  appVersion: string;
  environment: Environment;
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
  backupFrequency: BackupFrequency;
  backupRetentionDays: number;
  lastBackupAt: string | null;
  defaultDashboardView: string;
  recentItemsLimit: number;
  chartDefaultPeriodDays: number;
  featureFlags: Array<{
    id: string;
    featureKey: string;
    displayName: string;
    enabled: boolean;
    description: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type SettingsProfileResponse = {
  company: CompanySettingsResponse;
  system: SystemSettingsResponse;
};

export type UpdateCompanySettingsPayload = Partial<
  Omit<CompanySettingsResponse, "id" | "createdAt" | "updatedAt">
>;

export type UpdateSystemSettingsPayload = Partial<
  Omit<SystemSettingsResponse, "id" | "createdAt" | "updatedAt" | "featureFlags">
>;

export type UpdateSettingsPayload = {
  company?: UpdateCompanySettingsPayload;
  system?: UpdateSystemSettingsPayload;
};

export type UserProfileResponse = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  role: string;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};

export type UpdateProfilePayload = {
  name?: string;
  email?: string;
};

/** Preference fields sourced from company + system settings (no dedicated prefs API). */
export type UserPreferencesView = {
  language: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  timezone: string;
  currencyCode: string;
  currencySymbol: string;
  defaultDashboardView: string;
  recentItemsLimit: number;
  chartDefaultPeriodDays: number;
};

export type SecuritySettingsView = {
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
  appName: string;
  appVersion: string;
  environment: Environment;
};
