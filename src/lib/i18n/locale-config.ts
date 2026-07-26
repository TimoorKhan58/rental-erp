import { APPLICATION } from "@/constants/application";

export type LocaleConfig = {
  locale: string;
  currency: string;
  timezone: string;
};

const DEFAULT_LOCALE_CONFIG: LocaleConfig = {
  locale: APPLICATION.locale,
  currency: APPLICATION.currency,
  timezone: APPLICATION.timezone,
};

let activeLocaleConfig: LocaleConfig = { ...DEFAULT_LOCALE_CONFIG };

/** Product defaults — used before tenant settings load (and on the server). */
export function getDefaultLocaleConfig(): LocaleConfig {
  return { ...DEFAULT_LOCALE_CONFIG };
}

/** Active tenant/runtime locale used by shared formatters. */
export function getActiveLocaleConfig(): LocaleConfig {
  return activeLocaleConfig;
}

export function setActiveLocaleConfig(config: Partial<LocaleConfig>): LocaleConfig {
  activeLocaleConfig = {
    locale: config.locale?.trim() || DEFAULT_LOCALE_CONFIG.locale,
    currency: config.currency?.trim().toUpperCase() || DEFAULT_LOCALE_CONFIG.currency,
    timezone: config.timezone?.trim() || DEFAULT_LOCALE_CONFIG.timezone,
  };
  return activeLocaleConfig;
}

export function resetActiveLocaleConfig(): LocaleConfig {
  activeLocaleConfig = { ...DEFAULT_LOCALE_CONFIG };
  return activeLocaleConfig;
}

/** Resolve a display symbol for an ISO 4217 currency code (e.g. USD → $). */
export function getCurrencySymbol(currencyCode: string, locale = DEFAULT_LOCALE_CONFIG.locale): string {
  const code = currencyCode.trim().toUpperCase();

  try {
    const part = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((entry) => entry.type === "currency");

    return part?.value ?? code;
  } catch {
    return code;
  }
}
