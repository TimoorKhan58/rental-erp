export type {
  ErrorApiResponse,
  ErrorApiResponseBody,
  SuccessApiResponse,
} from "@/shared/infrastructure/http/api-response";

export type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export type PaginationParams = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
};

export type ApiRequestConfig = {
  params?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};
