import { APPLICATION } from "@/constants/application";

export const SETTINGS_MODULE = "settings";
export const SETTINGS_ENTITY_NAME = "Settings";

export const DOCUMENT_TYPES = [
  "RENTAL_ORDER",
  "PAYMENT",
  "DISPATCH",
  "EXPENSE",
  "REPAIR",
  "CUSTOMER",
  "PRODUCT",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const ENVIRONMENTS = ["DEVELOPMENT", "STAGING", "PRODUCTION"] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

export const BACKUP_FREQUENCIES = ["HOURLY", "DAILY", "WEEKLY", "MONTHLY"] as const;

export type BackupFrequency = (typeof BACKUP_FREQUENCIES)[number];

export const DEFAULT_COMPANY_SETTINGS = {
  currencyCode: APPLICATION.currency,
  currencySymbol: "Rs",
  timezone: APPLICATION.timezone,
  language: "en",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "HH:mm",
  numberFormat: "#,##0.00",
  country: APPLICATION.country,
  defaultRentalDays: 3,
  defaultTaxPercentage: 0,
  fiscalYearStartMonth: 1,
  securityDepositEnabled: false,
  lateFeeEnabled: false,
  isActive: true,
  setupCompleted: false,
  maintenanceMode: false,
} as const;

export const DEFAULT_SYSTEM_SETTINGS = {
  appName: APPLICATION.name,
  appVersion: APPLICATION.version,
  environment: "DEVELOPMENT" as Environment,
  minPasswordLength: 8,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  requireEmailVerification: false,
  allowPasswordReset: true,
  sessionTimeoutMinutes: 60,
  rememberMeDurationDays: 7,
  maxConcurrentSessions: 3,
  ipWhitelistEnabled: false,
  auditLogRetentionDays: 90,
  maxUploadSizeMb: 10,
  allowedFileTypes: "pdf,jpg,jpeg,png,doc,docx,xls,xlsx",
  emailNotificationsEnabled: true,
  smsNotificationsEnabled: false,
  backupEnabled: false,
  backupFrequency: "DAILY" as BackupFrequency,
  backupRetentionDays: 30,
  defaultDashboardView: "overview",
  recentItemsLimit: 10,
  chartDefaultPeriodDays: 30,
} as const;

export const DEFAULT_NUMBER_SEQUENCE = {
  startingNumber: 1,
  currentNumber: 1,
  paddingLength: 3,
  suffix: null,
} as const;
