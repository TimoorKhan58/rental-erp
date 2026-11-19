"use client";

import {
  createContext,
  Fragment,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCompanySettings } from "@/features/settings/hooks";
import {
  getDefaultLocaleConfig,
  setActiveLocaleConfig,
  type LocaleConfig,
} from "@/lib/i18n/locale-config";

const LocaleContext = createContext<LocaleConfig>(getDefaultLocaleConfig());

type LocaleProviderProps = {
  children: ReactNode;
};

/**
 * Syncs company settings (currency / language / timezone) into shared formatters.
 * Falls back to international product defaults until a tenant is loaded.
 */
export function LocaleProvider({ children }: LocaleProviderProps) {
  const { isAuthenticated } = useAuth();
  const { data: company } = useCompanySettings(isAuthenticated);

  const config = useMemo<LocaleConfig>(() => {
    if (!company) {
      return getDefaultLocaleConfig();
    }

    return {
      locale: company.language?.trim() || getDefaultLocaleConfig().locale,
      currency: company.currencyCode?.trim().toUpperCase() || getDefaultLocaleConfig().currency,
      timezone: company.timezone?.trim() || getDefaultLocaleConfig().timezone,
    };
  }, [company]);

  // Set during render (not in an effect) so everything drawn below already
  // uses the company's currency. The key redraws the screen once when the
  // currency, language or time zone changes: parts drawn before settings
  // arrived otherwise kept the default, e.g. "$8,400" for a PKR business
  // (QA on-screen run).
  setActiveLocaleConfig(config);
  const localeKey = `${config.currency}|${config.locale}|${config.timezone}`;

  return (
    <LocaleContext.Provider value={config}>
      <Fragment key={localeKey}>{children}</Fragment>
    </LocaleContext.Provider>
  );
}

export function useLocaleConfig(): LocaleConfig {
  return useContext(LocaleContext);
}
