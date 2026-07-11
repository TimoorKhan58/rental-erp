import { APPLICATION } from "@/constants/application";

const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options);

  if (!dateTimeFormatterCache.has(key)) {
    dateTimeFormatterCache.set(
      key,
      new Intl.DateTimeFormat("en-PK", {
        timeZone: APPLICATION.timezone,
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

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  return formatter.format(diffDays, "day");
}
