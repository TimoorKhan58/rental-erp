import packageJson from "../../package.json";

/**
 * Application-wide constants.
 * Single source of truth — import from here instead of hardcoding values.
 */
export const APPLICATION = {
  name: "Manyar Tent ERP",
  shortName: "MT ERP",
  tagline: "Rental operations, simplified.",
  version: packageJson.version,
  timezone: "Asia/Karachi",
  currency: "PKR",
  country: "Pakistan",
} as const;

export type ApplicationConstants = typeof APPLICATION;
