import type { ActiveFilterChip } from "@/components/shared";

export function dateRangeFilterChip(
  dateFrom: string | undefined,
  dateTo: string | undefined,
  fieldLabel: string,
  onClear: () => void,
): ActiveFilterChip | null {
  if (!dateFrom && !dateTo) {
    return null;
  }

  const from = dateFrom ?? "…";
  const to = dateTo ?? "…";
  return {
    id: "dateRange",
    label: `${fieldLabel}: ${from} – ${to}`,
    onClear,
  };
}

export function compactActiveFilters(
  chips: Array<ActiveFilterChip | null | undefined>,
): ActiveFilterChip[] {
  return chips.filter((chip): chip is ActiveFilterChip => chip != null);
}
