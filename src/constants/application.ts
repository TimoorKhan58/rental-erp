import packageJson from "../../package.json";

/**
 * Application-wide constants.
 * Single source of truth — import from here instead of hardcoding values.
 */
export const APPLICATION = {
  name: "Rental ERP",
  version: packageJson.version,
  client: "Manyar Tent Service",
  timezone: "Asia/Karachi",
  currency: "PKR",
  country: "Pakistan",
} as const;

export type ApplicationConstants = typeof APPLICATION;
