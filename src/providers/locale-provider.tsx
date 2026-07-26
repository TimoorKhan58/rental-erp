"use client";

import {
  createContext,
  useContext,
  useEffect,
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

  useEffect(() => {
    setActiveLocaleConfig(config);
  }, [config]);

  return <LocaleContext.Provider value={config}>{children}</LocaleContext.Provider>;
}

export function useLocaleConfig(): LocaleConfig {
  return useContext(LocaleContext);
}
