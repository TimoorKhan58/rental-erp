import type { CategoryId } from "@/shared/domain/ids";

export interface CategoryProps {
  readonly id: CategoryId;
  readonly name: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateCategoryData {
  readonly name: string;
  readonly description?: string | null;
  readonly isActive?: boolean;
}

export interface UpdateCategoryData {
  readonly name?: string;
  readonly description?: string | null;
  readonly isActive?: boolean;
}
