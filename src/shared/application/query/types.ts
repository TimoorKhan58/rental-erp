export interface PaginationInput {
  page: number;
  pageSize: number;
}

export interface PaginationResult extends PaginationInput {
  skip: number;
  take: number;
}

export interface SortInput {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export type SortResult = Record<string, "asc" | "desc">;

export type FilterInput = Record<string, unknown>;

export type FilterResult = Record<string, unknown>;
