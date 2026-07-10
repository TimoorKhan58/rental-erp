export const UNIT_MODULE = "units";
export const UNIT_ENTITY_NAME = "UnitOfMeasure";

export const UNIT_SEARCH_FIELDS = ["code", "name", "description"] as const;

export const UNIT_SORT_FIELDS = [
  "code",
  "name",
  "isActive",
  "createdAt",
] as const;

export type UnitSortField = (typeof UNIT_SORT_FIELDS)[number];
