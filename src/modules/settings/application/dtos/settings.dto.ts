import type {
  BackupFrequency,
  Environment,
} from "@/modules/settings/domain/settings.constants";

export interface CompanySettingsDto {
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

export interface FeatureFlagDto {
  id: string;
  featureKey: string;
  displayName: string;
  enabled: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettingsDto {
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
  featureFlags: FeatureFlagDto[];
  createdAt: string;
  updatedAt: string;
}

export interface SettingsProfileDto {
  company: CompanySettingsDto;
  system: SystemSettingsDto;
}

export interface UpdateCompanySettingsDto {
  companyName?: string;
  businessName?: string;
  ownerName?: string | null;
  phone?: string;
  secondaryPhone?: string | null;
  email?: string;
  website?: string | null;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string | null;
  ntn?: string | null;
  strn?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  currencyCode?: string;
  currencySymbol?: string;
  timezone?: string;
  language?: string;
  dateFormat?: string;
  timeFormat?: string;
  numberFormat?: string;
  defaultRentalDays?: number;
  defaultTaxPercentage?: number;
  fiscalYearStartMonth?: number;
  securityDepositEnabled?: boolean;
  lateFeeEnabled?: boolean;
  isActive?: boolean;
  setupCompleted?: boolean;
  maintenanceMode?: boolean;
}

export interface UpdateSystemSettingsDto {
  appName?: string;
  appVersion?: string;
  environment?: Environment;
  supportEmail?: string | null;
  supportPhone?: string | null;
  minPasswordLength?: number;
  maxLoginAttempts?: number;
  lockoutDurationMinutes?: number;
  requireEmailVerification?: boolean;
  allowPasswordReset?: boolean;
  sessionTimeoutMinutes?: number;
  rememberMeDurationDays?: number;
  maxConcurrentSessions?: number;
  passwordExpiryDays?: number | null;
  ipWhitelistEnabled?: boolean;
  auditLogRetentionDays?: number;
  maxUploadSizeMb?: number;
  allowedFileTypes?: string;
  uploadStoragePath?: string | null;
  emailNotificationsEnabled?: boolean;
  smsNotificationsEnabled?: boolean;
  defaultNotificationEmail?: string | null;
  backupEnabled?: boolean;
  backupFrequency?: BackupFrequency;
  backupRetentionDays?: number;
  lastBackupAt?: string | null;
  defaultDashboardView?: string;
  recentItemsLimit?: number;
  chartDefaultPeriodDays?: number;
}

export interface UpdateSettingsDto {
  company?: UpdateCompanySettingsDto;
  system?: UpdateSystemSettingsDto;
}
