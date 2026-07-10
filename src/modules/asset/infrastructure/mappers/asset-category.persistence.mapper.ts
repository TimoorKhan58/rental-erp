import { AssetCategory } from "@/modules/asset/domain";
import type {
  CreateAssetCategoryData,
  UpdateAssetCategoryData,
} from "@/modules/asset/domain";
import type { AssetCategoryId } from "@/shared/domain/ids";

export function toAssetCategoryDomain(record: {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AssetCategory {
  return AssetCategory.reconstitute({
    id: record.id as AssetCategoryId,
    name: record.name,
    description: record.description,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toAssetCategoryCreateInput(data: CreateAssetCategoryData) {
  const normalized = AssetCategory.create(data);

  return {
    name: normalized.name,
    description: normalized.description,
    isActive: normalized.isActive,
  };
}

export function toAssetCategoryUpdateInput(data: UpdateAssetCategoryData) {
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
  };
}
