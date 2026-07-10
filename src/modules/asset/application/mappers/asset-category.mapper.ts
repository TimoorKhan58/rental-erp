import type { AssetCategory } from "@/modules/asset/domain";
import type { AssetCategoryId } from "@/shared/domain/ids";

import type { AssetCategoryDto } from "../dtos/asset-category.dto";
import type {
  CreateAssetCategoryInput,
  UpdateAssetCategoryInput,
} from "../schemas/asset-category.schemas";
import type {
  CreateAssetCategoryData,
  UpdateAssetCategoryData,
} from "@/modules/asset/domain";

export function toAssetCategoryId(id: string): AssetCategoryId {
  return id as AssetCategoryId;
}

export function toAssetCategoryDto(category: AssetCategory): AssetCategoryDto {
  const props = category.toProps();

  return {
    id: props.id,
    name: props.name,
    description: props.description,
    isActive: props.isActive,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreateAssetCategoryData(
  input: CreateAssetCategoryInput,
): CreateAssetCategoryData {
  return {
    name: input.name,
    description: input.description,
    isActive: input.isActive,
  };
}

export function toUpdateAssetCategoryData(
  input: UpdateAssetCategoryInput,
): UpdateAssetCategoryData {
  return {
    name: input.name,
    description: input.description,
    isActive: input.isActive,
  };
}
