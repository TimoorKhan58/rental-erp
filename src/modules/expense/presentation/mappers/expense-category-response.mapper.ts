import type { ExpenseCategoryDto } from "@/modules/expense/application/dtos/expense-category.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface ExpenseCategoryResponse {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategoryListResponse {
  items: ExpenseCategoryResponse[];
  meta: PaginationMeta;
}

export function toExpenseCategoryResponse(
  dto: ExpenseCategoryDto,
): ExpenseCategoryResponse {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    isActive: dto.isActive,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toExpenseCategoryListResponse(
  result: PaginatedResult<ExpenseCategoryDto>,
): ExpenseCategoryListResponse {
  return {
    items: result.items.map(toExpenseCategoryResponse),
    meta: result.meta,
  };
}
