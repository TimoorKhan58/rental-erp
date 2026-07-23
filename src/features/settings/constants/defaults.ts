import { APPLICATION } from "@/constants/application";

/** Client-safe defaults for resetting preferences in the settings UI. */
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
  defaultDashboardView: "overview",
  recentItemsLimit: 10,
  chartDefaultPeriodDays: 30,
} as const;
