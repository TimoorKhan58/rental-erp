import { getActiveLocaleConfig } from "@/lib/i18n/locale-config";

const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const { locale, timezone } = getActiveLocaleConfig();
  const key = `${locale}|${timezone}|${JSON.stringify(options)}`;

  if (!dateTimeFormatterCache.has(key)) {
    dateTimeFormatterCache.set(
      key,
      new Intl.DateTimeFormat(locale, {
        timeZone: timezone,
        ...options,
      }),
    );
  }

  return dateTimeFormatterCache.get(key)!;
}

export function formatDate(
  value: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "2-digit",
  },
): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return getDateTimeFormatter(options).format(date);
}

export function formatDateTime(
  value: Date | string | number | null | undefined,
): string {
  return formatDate(value, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeDays(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const formatter = new Intl.RelativeTimeFormat(getActiveLocaleConfig().locale, {
    numeric: "auto",
  });
  return formatter.format(diffDays, "day");
}
