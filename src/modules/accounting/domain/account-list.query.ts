import type { AccountSortField, AccountType } from "./account.constants";

export interface AccountListQuery {
  page: number;
  pageSize: number;
  sortBy?: AccountSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  accountType?: AccountType;
  isActive?: boolean;
}
