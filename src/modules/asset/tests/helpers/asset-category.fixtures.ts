import { AssetCategory } from "@/modules/asset/domain/asset-category.entity";
import type { CreateAssetCategoryData } from "@/modules/asset/domain/asset-category.types";
import type { AssetCategoryId } from "@/shared/domain/ids";

export const CATEGORY_ID =
  "aa0e8400-e29b-41d4-a716-446655440010" as AssetCategoryId;

export const OTHER_CATEGORY_ID =
  "aa0e8400-e29b-41d4-a716-446655440011" as AssetCategoryId;

export const VALID_CREATE_CATEGORY_INPUT = {
  name: "Equipment",
  description: "Heavy machinery and tools",
  isActive: true,
};

export function buildCreateCategoryData(
  override: Partial<CreateAssetCategoryData> = {},
): CreateAssetCategoryData {
  return {
    name: VALID_CREATE_CATEGORY_INPUT.name,
    description: VALID_CREATE_CATEGORY_INPUT.description,
    isActive: VALID_CREATE_CATEGORY_INPUT.isActive,
    ...override,
  };
}

export function buildCategoryEntity(
  override: Partial<ReturnType<typeof AssetCategory.create>> & {
    id?: AssetCategoryId;
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): AssetCategory {
  const created = AssetCategory.create(buildCreateCategoryData());
  const now = new Date("2026-01-15T10:00:00.000Z");

  return AssetCategory.reconstitute({
    id: override.id ?? CATEGORY_ID,
    name: override.name ?? created.name,
    description: override.description ?? created.description,
    isActive: override.isActive ?? created.isActive,
    createdAt: override.createdAt ?? now,
    updatedAt: override.updatedAt ?? now,
  });
}
