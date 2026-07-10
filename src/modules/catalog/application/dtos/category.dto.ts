export interface CategoryDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CategoryIdParamDto {
  id: string;
}
