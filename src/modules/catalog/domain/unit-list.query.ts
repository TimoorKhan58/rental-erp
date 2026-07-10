import type { UnitSortField } from "./unit.constants";

export interface UnitListQuery {
  page: number;
  pageSize: number;
  sortBy?: UnitSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
}
