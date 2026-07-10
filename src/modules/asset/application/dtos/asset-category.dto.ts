export interface AssetCategoryDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetCategoryDto {
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateAssetCategoryDto {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface AssetCategoryIdParamDto {
  id: string;
}
