import type { AssetCategoryId } from "@/shared/domain/ids";

export interface CreateAssetCategoryData {
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateAssetCategoryData {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface AssetCategoryProps {
  id: AssetCategoryId;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
