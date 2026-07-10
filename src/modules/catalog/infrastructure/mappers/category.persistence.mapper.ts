import type { Prisma } from "@/generated/prisma/client";
import { Category } from "@/modules/catalog/domain/category.entity";
import type {
  CreateCategoryData,
  UpdateCategoryData,
} from "@/modules/catalog/domain/category.types";
import type { CategoryId } from "@/shared/domain/ids";

export function toCategoryDomain(record: {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Category {
  return Category.reconstitute({
    id: record.id as CategoryId,
    name: record.name,
    description: record.description,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toCategoryCreateInput(
  data: CreateCategoryData,
): Prisma.CategoryCreateInput {
  const normalized = Category.create(data);

  return {
    name: normalized.name,
    description: normalized.description,
    isActive: normalized.isActive,
  };
}

export function toCategoryUpdateInput(
  data: UpdateCategoryData,
): Prisma.CategoryUpdateInput {
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
  };
}
