import type { ExpenseCategory } from "@/modules/expense/domain/expense-category.entity";
import type { ExpenseCategoryListQuery } from "@/modules/expense/domain/expense-category-list.query";
import type {
  CreateExpenseCategoryData,
  UpdateExpenseCategoryData,
} from "@/modules/expense/domain/expense-category.types";
import type { ExpenseCategoryId } from "@/shared/domain/ids";

import type { ExpenseCategoryDto } from "../dtos/expense-category.dto";
import type {
  CreateExpenseCategoryInput,
  UpdateExpenseCategoryInput,
} from "../schemas/expense-category.schemas";
import type { ListExpenseCategoriesInput } from "../schemas/list-expense-categories.schema";

export function toExpenseCategoryId(id: string): ExpenseCategoryId {
  return id as ExpenseCategoryId;
}

export function toExpenseCategoryDto(
  category: ExpenseCategory,
): ExpenseCategoryDto {
  const props = category.toProps();

  return {
    id: props.id,
    name: props.name,
    description: props.description,
    isActive: props.isActive,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreateExpenseCategoryData(
  input: CreateExpenseCategoryInput,
): CreateExpenseCategoryData {
  return {
    name: input.name,
    description: input.description,
    isActive: input.isActive,
  };
}

export function toUpdateExpenseCategoryData(
  input: UpdateExpenseCategoryInput,
): UpdateExpenseCategoryData {
  return {
    name: input.name,
    description: input.description,
    isActive: input.isActive,
  };
}

export function toExpenseCategoryListQuery(
  input: ListExpenseCategoriesInput,
): ExpenseCategoryListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    isActive: input.isActive,
  };
}
