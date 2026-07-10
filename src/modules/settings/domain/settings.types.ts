import type {
  CompanySettingId,
  FeatureFlagId,
  SystemSettingId,
} from "@/shared/domain/ids";

import type { BackupFrequency, Environment } from "./settings.constants";

export interface SettingsProps {
  readonly id: CompanySettingId;
  readonly companyName: string;
  readonly businessName: string;
  readonly ownerName: string | null;
  readonly phone: string;
  readonly secondaryPhone: string | null;
  readonly email: string;
  readonly website: string | null;
  readonly address: string;
  readonly city: string;
  readonly province: string;
  readonly country: string;
  readonly postalCode: string | null;
  readonly ntn: string | null;
  readonly strn: string | null;
  readonly logoUrl: string | null;
  readonly faviconUrl: string | null;
  readonly currencyCode: string;
  readonly currencySymbol: string;
  readonly timezone: string;
  readonly language: string;
  readonly dateFormat: string;
  readonly timeFormat: string;
  readonly numberFormat: string;
  readonly defaultRentalDays: number;
  readonly defaultTaxPercentage: number;
  readonly fiscalYearStartMonth: number;
  readonly securityDepositEnabled: boolean;
  readonly lateFeeEnabled: boolean;
  readonly isActive: boolean;
  readonly setupCompleted: boolean;
  readonly maintenanceMode: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface FeatureFlagProps {
  readonly id: FeatureFlagId;
  readonly systemSettingId: SystemSettingId;
  readonly featureKey: string;
  readonly displayName: string;
  readonly enabled: boolean;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SystemSettingsProps {
  readonly id: SystemSettingId;
  readonly appName: string;
  readonly appVersion: string;
  readonly environment: Environment;
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
  readonly backupFrequency: BackupFrequency;
  readonly backupRetentionDays: number;
  readonly lastBackupAt: Date | null;
  readonly defaultDashboardView: string;
  readonly recentItemsLimit: number;
  readonly chartDefaultPeriodDays: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateSettingsData {
  readonly companyName: string;
  readonly businessName: string;
  readonly ownerName?: string | null;
  readonly phone: string;
  readonly secondaryPhone?: string | null;
  readonly email: string;
  readonly website?: string | null;
  readonly address: string;
  readonly city: string;
  readonly province: string;
  readonly country: string;
  readonly postalCode?: string | null;
  readonly ntn?: string | null;
  readonly strn?: string | null;
  readonly logoUrl?: string | null;
  readonly faviconUrl?: string | null;
  readonly currencyCode?: string;
  readonly currencySymbol?: string;
  readonly timezone?: string;
  readonly language?: string;
  readonly dateFormat?: string;
  readonly timeFormat?: string;
  readonly numberFormat?: string;
  readonly defaultRentalDays?: number;
  readonly defaultTaxPercentage?: number;
  readonly fiscalYearStartMonth?: number;
  readonly securityDepositEnabled?: boolean;
  readonly lateFeeEnabled?: boolean;
  readonly isActive?: boolean;
  readonly setupCompleted?: boolean;
  readonly maintenanceMode?: boolean;
}

export interface UpdateSettingsData {
  readonly companyName?: string;
  readonly businessName?: string;
  readonly ownerName?: string | null;
  readonly phone?: string;
  readonly secondaryPhone?: string | null;
  readonly email?: string;
  readonly website?: string | null;
  readonly address?: string;
  readonly city?: string;
  readonly province?: string;
  readonly country?: string;
  readonly postalCode?: string | null;
  readonly ntn?: string | null;
  readonly strn?: string | null;
  readonly logoUrl?: string | null;
  readonly faviconUrl?: string | null;
  readonly currencyCode?: string;
  readonly currencySymbol?: string;
  readonly timezone?: string;
  readonly language?: string;
  readonly dateFormat?: string;
  readonly timeFormat?: string;
  readonly numberFormat?: string;
  readonly defaultRentalDays?: number;
  readonly defaultTaxPercentage?: number;
  readonly fiscalYearStartMonth?: number;
  readonly securityDepositEnabled?: boolean;
  readonly lateFeeEnabled?: boolean;
  readonly isActive?: boolean;
  readonly setupCompleted?: boolean;
  readonly maintenanceMode?: boolean;
}

export interface UpdateSystemSettingsData {
  readonly appName?: string;
  readonly appVersion?: string;
  readonly environment?: Environment;
  readonly supportEmail?: string | null;
  readonly supportPhone?: string | null;
  readonly minPasswordLength?: number;
  readonly maxLoginAttempts?: number;
  readonly lockoutDurationMinutes?: number;
  readonly requireEmailVerification?: boolean;
  readonly allowPasswordReset?: boolean;
  readonly sessionTimeoutMinutes?: number;
  readonly rememberMeDurationDays?: number;
  readonly maxConcurrentSessions?: number;
  readonly passwordExpiryDays?: number | null;
  readonly ipWhitelistEnabled?: boolean;
  readonly auditLogRetentionDays?: number;
  readonly maxUploadSizeMb?: number;
  readonly allowedFileTypes?: string;
  readonly uploadStoragePath?: string | null;
  readonly emailNotificationsEnabled?: boolean;
  readonly smsNotificationsEnabled?: boolean;
  readonly defaultNotificationEmail?: string | null;
  readonly backupEnabled?: boolean;
  readonly backupFrequency?: BackupFrequency;
  readonly backupRetentionDays?: number;
  readonly lastBackupAt?: Date | null;
  readonly defaultDashboardView?: string;
  readonly recentItemsLimit?: number;
  readonly chartDefaultPeriodDays?: number;
}
