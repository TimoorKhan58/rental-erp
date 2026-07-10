import { z } from "zod";

import {
  BACKUP_FREQUENCIES,
  ENVIRONMENTS,
} from "@/modules/settings/domain/settings.constants";
import {
  EmailSchema,
  NonEmptyStringSchema,
  PhoneSchema,
  PositiveIntSchema,
  TrimmedStringSchema,
} from "@/shared/application/validation";

const TaxPercentageSchema = z.coerce
  .number()
  .min(0, "Tax percentage must be at least 0")
  .max(100, "Tax percentage must be at most 100");

const FiscalYearStartMonthSchema = z.coerce
  .number()
  .int()
  .min(1, "Fiscal year start month must be between 1 and 12")
  .max(12, "Fiscal year start month must be between 1 and 12");

const UpdateCompanySettingsSchema = z
  .object({
    companyName: NonEmptyStringSchema.max(200).optional(),
    businessName: NonEmptyStringSchema.max(200).optional(),
    ownerName: TrimmedStringSchema.max(200).optional().nullable(),
    phone: PhoneSchema.optional(),
    secondaryPhone: PhoneSchema.optional().nullable(),
    email: EmailSchema.optional(),
    website: TrimmedStringSchema.max(500).optional().nullable(),
    address: NonEmptyStringSchema.max(500).optional(),
    city: NonEmptyStringSchema.max(100).optional(),
    province: NonEmptyStringSchema.max(100).optional(),
    country: NonEmptyStringSchema.max(100).optional(),
    postalCode: TrimmedStringSchema.max(20).optional().nullable(),
    ntn: TrimmedStringSchema.max(50).optional().nullable(),
    strn: TrimmedStringSchema.max(50).optional().nullable(),
    logoUrl: TrimmedStringSchema.max(500).optional().nullable(),
    faviconUrl: TrimmedStringSchema.max(500).optional().nullable(),
    currencyCode: NonEmptyStringSchema.max(10).optional(),
    currencySymbol: NonEmptyStringSchema.max(10).optional(),
    timezone: NonEmptyStringSchema.max(100).optional(),
    language: NonEmptyStringSchema.max(10).optional(),
    dateFormat: NonEmptyStringSchema.max(50).optional(),
    timeFormat: NonEmptyStringSchema.max(50).optional(),
    numberFormat: NonEmptyStringSchema.max(50).optional(),
    defaultRentalDays: PositiveIntSchema.optional(),
    defaultTaxPercentage: TaxPercentageSchema.optional(),
    fiscalYearStartMonth: FiscalYearStartMonthSchema.optional(),
    securityDepositEnabled: z.boolean().optional(),
    lateFeeEnabled: z.boolean().optional(),
    isActive: z.boolean().optional(),
    setupCompleted: z.boolean().optional(),
    maintenanceMode: z.boolean().optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    { message: "At least one company field must be provided for update" },
  );

const UpdateSystemSettingsSchema = z
  .object({
    appName: NonEmptyStringSchema.max(200).optional(),
    appVersion: NonEmptyStringSchema.max(50).optional(),
    environment: z.enum(ENVIRONMENTS).optional(),
    supportEmail: EmailSchema.optional().nullable(),
    supportPhone: PhoneSchema.optional().nullable(),
    minPasswordLength: PositiveIntSchema.optional(),
    maxLoginAttempts: PositiveIntSchema.optional(),
    lockoutDurationMinutes: z.coerce.number().int().nonnegative().optional(),
    requireEmailVerification: z.boolean().optional(),
    allowPasswordReset: z.boolean().optional(),
    sessionTimeoutMinutes: PositiveIntSchema.optional(),
    rememberMeDurationDays: PositiveIntSchema.optional(),
    maxConcurrentSessions: PositiveIntSchema.optional(),
    passwordExpiryDays: PositiveIntSchema.optional().nullable(),
    ipWhitelistEnabled: z.boolean().optional(),
    auditLogRetentionDays: PositiveIntSchema.optional(),
    maxUploadSizeMb: PositiveIntSchema.optional(),
    allowedFileTypes: NonEmptyStringSchema.max(500).optional(),
    uploadStoragePath: TrimmedStringSchema.max(500).optional().nullable(),
    emailNotificationsEnabled: z.boolean().optional(),
    smsNotificationsEnabled: z.boolean().optional(),
    defaultNotificationEmail: EmailSchema.optional().nullable(),
    backupEnabled: z.boolean().optional(),
    backupFrequency: z.enum(BACKUP_FREQUENCIES).optional(),
    backupRetentionDays: PositiveIntSchema.optional(),
    lastBackupAt: z.coerce.date().optional().nullable(),
    defaultDashboardView: NonEmptyStringSchema.max(100).optional(),
    recentItemsLimit: PositiveIntSchema.optional(),
    chartDefaultPeriodDays: PositiveIntSchema.optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    { message: "At least one system field must be provided for update" },
  );

export const UpdateSettingsSchema = z
  .object({
    company: UpdateCompanySettingsSchema.optional(),
    system: UpdateSystemSettingsSchema.optional(),
  })
  .refine(
    (value) => value.company !== undefined || value.system !== undefined,
    { message: "At least one of company or system must be provided for update" },
  );

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
