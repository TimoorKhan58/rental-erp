import type { CategoryId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type {
  CategoryProps,
  CreateCategoryData,
  UpdateCategoryData,
} from "./category.types";
import { normalizeOptionalText, normalizeRequiredText } from "./category.rules";

export class Category implements Entity<CategoryId> {
  readonly id: CategoryId;
  readonly name: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: CategoryProps) {
    this.id = props.id;
    this.name = normalizeRequiredText(props.name, "name");
    this.description = normalizeOptionalText(props.description);
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    data: CreateCategoryData,
  ): Omit<CategoryProps, "id" | "createdAt" | "updatedAt"> {
    return {
      name: normalizeRequiredText(data.name, "name"),
      description: normalizeOptionalText(data.description),
      isActive: data.isActive ?? true,
    };
  }

  static reconstitute(props: CategoryProps): Category {
    return new Category(props);
  }

  toProps(): CategoryProps {
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

export function toUpdatedCategoryProps(
  category: Category,
  data: UpdateCategoryData,
): CategoryProps {
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
