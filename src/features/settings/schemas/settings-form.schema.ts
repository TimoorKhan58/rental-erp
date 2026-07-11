import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .min(7, "Phone number is too short")
  .max(20, "Phone number is too long")
  .regex(/^[+]?[\d\s()-]+$/, "Invalid phone number format");

export const updateProfileFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Invalid email address"),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileFormSchema>;

export const updateCompanyFormSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  businessName: z.string().trim().min(1).max(200),
  ownerName: z.string().trim().max(200).nullable().optional(),
  phone: phoneSchema,
  secondaryPhone: z.string().trim().max(20).nullable().optional(),
  email: z.string().trim().email(),
  website: z.string().trim().max(500).nullable().optional(),
  address: z.string().trim().min(1).max(500),
  city: z.string().trim().min(1).max(100),
  province: z.string().trim().min(1).max(100),
  country: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().max(20).nullable().optional(),
  ntn: z.string().trim().max(50).nullable().optional(),
  strn: z.string().trim().max(50).nullable().optional(),
  logoUrl: z.string().trim().max(500).nullable().optional(),
  faviconUrl: z.string().trim().max(500).nullable().optional(),
  currencyCode: z.string().trim().min(1).max(10),
  currencySymbol: z.string().trim().min(1).max(10),
  timezone: z.string().trim().min(1).max(100),
  language: z.string().trim().min(1).max(10),
  dateFormat: z.string().trim().min(1).max(50),
  timeFormat: z.string().trim().min(1).max(50),
  numberFormat: z.string().trim().min(1).max(50),
  defaultRentalDays: z.number().int().positive(),
  defaultTaxPercentage: z.number().min(0).max(100),
  fiscalYearStartMonth: z.number().int().min(1).max(12),
  securityDepositEnabled: z.boolean(),
  lateFeeEnabled: z.boolean(),
  isActive: z.boolean(),
  setupCompleted: z.boolean(),
  maintenanceMode: z.boolean(),
});

export type UpdateCompanyFormValues = z.infer<typeof updateCompanyFormSchema>;

export const updatePreferencesFormSchema = z.object({
  language: z.string().trim().min(1).max(10),
  dateFormat: z.string().trim().min(1).max(50),
  timeFormat: z.string().trim().min(1).max(50),
  numberFormat: z.string().trim().min(1).max(50),
  timezone: z.string().trim().min(1).max(100),
  currencyCode: z.string().trim().min(1).max(10),
  currencySymbol: z.string().trim().min(1).max(10),
  defaultDashboardView: z.string().trim().min(1).max(100),
  recentItemsLimit: z.number().int().positive(),
  chartDefaultPeriodDays: z.number().int().positive(),
});

export type UpdatePreferencesFormValues = z.infer<
  typeof updatePreferencesFormSchema
>;

export const updateSecurityFormSchema = z.object({
  minPasswordLength: z.number().int().positive(),
  maxLoginAttempts: z.number().int().positive(),
  lockoutDurationMinutes: z.number().int().nonnegative(),
  requireEmailVerification: z.boolean(),
  allowPasswordReset: z.boolean(),
  sessionTimeoutMinutes: z.number().int().positive(),
  rememberMeDurationDays: z.number().int().positive(),
  maxConcurrentSessions: z.number().int().positive(),
  passwordExpiryDays: z.number().int().positive().nullable().optional(),
  ipWhitelistEnabled: z.boolean(),
});

export type UpdateSecurityFormValues = z.infer<typeof updateSecurityFormSchema>;

export function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }
  return value.trim();
}
