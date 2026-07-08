import type {
  FilterInput,
  PaginationInput,
  SortInput,
} from "@/shared/application/query";

export interface SearchInput {
  term?: string;
  fields?: readonly string[];
}

export interface RepositoryQuerySpec {
  pagination: PaginationInput;
  sort?: SortInput;
  filter?: FilterInput;
  search?: SearchInput;
}

export interface CreateRepositoryQuerySpecInput {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filter?: FilterInput;
  search?: string;
  searchFields?: readonly string[];
}

export function createRepositoryQuerySpec(
  input: CreateRepositoryQuerySpecInput,
): RepositoryQuerySpec {
  const searchTerm = input.search?.trim();

  return {
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
    },
    sort: {
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
    },
    filter: input.filter,
    search:
      searchTerm && searchTerm.length > 0
        ? {
            term: searchTerm,
            fields: input.searchFields,
          }
        : undefined,
  };
}
