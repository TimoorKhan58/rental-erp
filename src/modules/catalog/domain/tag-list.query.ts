import type { TagSortField } from "./tag.constants";

export interface TagListQuery {
  page: number;
  pageSize: number;
  sortBy?: TagSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
}
