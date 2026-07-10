import type { IdentityUserSortField } from "./identity-user.constants";

export interface IdentityUserListQuery {
  page: number;
  pageSize: number;
  sortBy?: IdentityUserSortField;
  sortOrder: "asc" | "desc";
  search?: string;
  isActive?: boolean;
  role?: string;
}
