import type { ExpenseCategoryId } from "@/shared/domain/ids";

export interface ExpenseCategoryProps {
  readonly id: ExpenseCategoryId;
  readonly name: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateExpenseCategoryData {
  readonly name: string;
  readonly description?: string | null;
  readonly isActive?: boolean;
}

export interface UpdateExpenseCategoryData {
  readonly name?: string;
  readonly description?: string | null;
  readonly isActive?: boolean;
}
