import type { Prisma } from "@/generated/prisma/client";
import { ExpenseCategory } from "@/modules/expense/domain/expense-category.entity";
import type {
  CreateExpenseCategoryData,
  UpdateExpenseCategoryData,
} from "@/modules/expense/domain/expense-category.types";
import type { ExpenseCategoryId } from "@/shared/domain/ids";

export function toExpenseCategoryDomain(record: {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ExpenseCategory {
  return ExpenseCategory.reconstitute({
    id: record.id as ExpenseCategoryId,
    name: record.name,
    description: record.description,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toExpenseCategoryCreateInput(
  data: CreateExpenseCategoryData,
): Prisma.ExpenseCategoryCreateInput {
  const normalized = ExpenseCategory.create(data);

  return {
    name: normalized.name,
    description: normalized.description,
    isActive: normalized.isActive,
  };
}

export function toExpenseCategoryUpdateInput(
  data: UpdateExpenseCategoryData,
): Prisma.ExpenseCategoryUpdateInput {
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
  };
}
