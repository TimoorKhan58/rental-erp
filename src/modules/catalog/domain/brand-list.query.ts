import type { BrandSortField } from "./brand.constants";

export interface BrandListQuery {
  page: number;
  pageSize: number;
  sortBy?: BrandSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
}
