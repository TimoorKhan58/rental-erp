import packageJson from "../../package.json";

/**
 * Product identity and international defaults.
 * Tenant-specific currency, timezone, and country live in company settings —
 * never hardcode a single market into formatters or marketing UI.
 */
export const APPLICATION = {
  name: "Rental ERP",
  shortName: "MT ERP",
  tagline: "Rental operations, simplified.",
  version: packageJson.version,
  /** BCP 47 locale for Intl formatters (override per tenant via settings). */
  locale: "en",
  /** IANA timezone default for fresh installs. */
  timezone: "UTC",
  /** ISO 4217 default; tenants set PKR, EUR, AED, etc. in company settings. */
  currency: "USD",
} as const;

export type ApplicationConstants = typeof APPLICATION;
