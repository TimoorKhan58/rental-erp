export interface BrandDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandDto {
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateBrandDto {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface BrandIdParamDto {
  id: string;
}
