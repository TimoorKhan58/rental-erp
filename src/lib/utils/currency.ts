import { APPLICATION } from "@/constants/application";

const currencyFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: APPLICATION.currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(
  value: number | null | undefined,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  if (!options) {
    return currencyFormatter.format(value);
  }

  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: APPLICATION.currency,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(value);
}

export function parseCurrencyInput(value: string): number | null {
  const normalized = value.replace(/[^\d.-]/g, "");

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}
