import { getActiveLocaleConfig } from "@/lib/i18n/locale-config";

type FormatCurrencyOptions = {
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export function formatCurrency(
  value: number | null | undefined,
  options?: FormatCurrencyOptions,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  const active = getActiveLocaleConfig();
  const locale = options?.locale ?? active.locale;
  const currency = options?.currency ?? active.currency;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: options?.minimumFractionDigits ?? 0,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    }).format(value);
  } catch {
    // Invalid currency/locale from tenant settings — still show a usable amount.
    return `${currency} ${value.toLocaleString(locale, {
      minimumFractionDigits: options?.minimumFractionDigits ?? 0,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    })}`;
  }
}

export function parseCurrencyInput(value: string): number | null {
  const normalized = value.replace(/[^\d.-]/g, "");

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}
