import type { CategorySortField } from "./category.constants";

export interface CategoryListQuery {
  page: number;
  pageSize: number;
  sortBy?: CategorySortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
}
