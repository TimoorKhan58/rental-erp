import type { AssetCategoryId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import { AssetCategoryInvariantError } from "./asset-category.errors";
import type {
  AssetCategoryProps,
  CreateAssetCategoryData,
  UpdateAssetCategoryData,
} from "./asset-category.types";

export class AssetCategory implements Entity<AssetCategoryId> {
  readonly id: AssetCategoryId;
  readonly name: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: AssetCategoryProps) {
    this.id = props.id;
    this.name = normalizeRequiredText(props.name, "name");
    this.description = normalizeOptionalText(props.description);
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    data: CreateAssetCategoryData,
  ): Omit<AssetCategoryProps, "id" | "createdAt" | "updatedAt"> {
    return {
      name: normalizeRequiredText(data.name, "name"),
      description: normalizeOptionalText(data.description),
      isActive: data.isActive ?? true,
    };
  }

  static reconstitute(props: AssetCategoryProps): AssetCategory {
    return new AssetCategory(props);
  }

  toProps(): AssetCategoryProps {
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

function normalizeRequiredText(value: string, field: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new AssetCategoryInvariantError(`${field} is required`, field);
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

export function toUpdatedAssetCategoryProps(
  category: AssetCategory,
  data: UpdateAssetCategoryData,
): AssetCategoryProps {
  return {
    ...category.toProps(),
    name: data.name !== undefined ? normalizeRequiredText(data.name, "name") : category.name,
    description:
      data.description !== undefined
        ? normalizeOptionalText(data.description)
        : category.description,
    isActive: data.isActive ?? category.isActive,
    updatedAt: new Date(),
  };
}
