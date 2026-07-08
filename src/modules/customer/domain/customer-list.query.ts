export interface CustomerListQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
}
