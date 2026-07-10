import type { AttributeSortField } from "./attribute.constants";

export interface AttributeListQuery {
  page: number;
  pageSize: number;
  sortBy?: AttributeSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
  dataType?: string;
}
