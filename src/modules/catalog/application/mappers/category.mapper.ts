import type { Category } from "@/modules/catalog/domain/category.entity";
import type { CategoryListQuery } from "@/modules/catalog/domain/category-list.query";
import type {
  CreateCategoryData,
  UpdateCategoryData,
} from "@/modules/catalog/domain/category.types";
import type { CategoryId } from "@/shared/domain/ids";

import type { CategoryDto } from "../dtos/category.dto";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../schemas/category.schemas";
import type { ListCategoriesInput } from "../schemas/list-categories.schema";

export function toCategoryId(id: string): CategoryId {
  return id as CategoryId;
}

export function toCategoryDto(
  entity: Category,
): CategoryDto {
  const props = entity.toProps();

  return {
    id: props.id,
    name: props.name,
    description: props.description,
    isActive: props.isActive,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreateCategoryData(
  input: CreateCategoryInput,
): CreateCategoryData {
  return {
    name: input.name,
    description: input.description,
    isActive: input.isActive,
  };
}

export function toUpdateCategoryData(
  input: UpdateCategoryInput,
): UpdateCategoryData {
  return {
    name: input.name,
    description: input.description,
    isActive: input.isActive,
  };
}

export function toCategoryListQuery(
  input: ListCategoriesInput,
): CategoryListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    isActive: input.isActive,
  };
}
