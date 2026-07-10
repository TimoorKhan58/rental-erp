import type { ExpenseCategoryId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import { ExpenseCategoryInvariantError } from "./expense-category.errors";
import type {
  CreateExpenseCategoryData,
  ExpenseCategoryProps,
  UpdateExpenseCategoryData,
} from "./expense-category.types";

export class ExpenseCategory implements Entity<ExpenseCategoryId> {
  readonly id: ExpenseCategoryId;
  readonly name: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: ExpenseCategoryProps) {
    this.id = props.id;
    this.name = normalizeRequiredText(props.name, "name");
    this.description = normalizeOptionalText(props.description);
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    data: CreateExpenseCategoryData,
  ): Omit<ExpenseCategoryProps, "id" | "createdAt" | "updatedAt"> {
    return {
      name: normalizeRequiredText(data.name, "name"),
      description: normalizeOptionalText(data.description),
      isActive: data.isActive ?? true,
    };
  }

  static reconstitute(props: ExpenseCategoryProps): ExpenseCategory {
    return new ExpenseCategory(props);
  }

  toProps(): ExpenseCategoryProps {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export function toUpdatedExpenseCategoryProps(
  category: ExpenseCategory,
  data: UpdateExpenseCategoryData,
): ExpenseCategoryProps {
  return {
    ...category.toProps(),
    name:
      data.name !== undefined
        ? normalizeRequiredText(data.name, "name")
        : category.name,
    description:
      data.description !== undefined
        ? normalizeOptionalText(data.description)
        : category.description,
    isActive: data.isActive ?? category.isActive,
    updatedAt: new Date(),
  };
}

function normalizeRequiredText(value: string, field: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ExpenseCategoryInvariantError(`${field} is required`, field);
  }

  return trimmed;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
