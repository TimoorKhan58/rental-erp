export interface ProductImageDto {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductSpecificationDto {
  id: string;
  key: string;
  value: string;
  sortOrder: number;
}

export interface ProductAttributeValueDto {
  id: string;
  attributeId: string;
  value: string;
}

export interface ProductDto {
  id: string;
  productCode: string;
  name: string;
  description: string | null;
  unit: string;
  rentalRate: string;
  replacementCost: string | null;
  isActive: boolean;
  categoryId: string | null;
  brandId: string | null;
  unitId: string | null;
  tags: string[];
  images: ProductImageDto[];
  specifications: ProductSpecificationDto[];
  attributeValues: ProductAttributeValueDto[];
  variantCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  productCode: string;
  name: string;
  description?: string | null;
  unit: string;
  rentalRate: number;
  replacementCost?: number | null;
  isActive?: boolean;
  categoryId?: string | null;
  brandId?: string | null;
  unitId?: string | null;
  tagIds?: string[];
  images?: Array<{
    url: string;
    altText?: string | null;
    sortOrder?: number;
    isPrimary?: boolean;
  }>;
  specifications?: Array<{
    key: string;
    value: string;
    sortOrder?: number;
  }>;
  attributeValues?: Array<{
    attributeId: string;
    value: string;
  }>;
}

export interface UpdateProductDto {
  name?: string;
  description?: string | null;
  unit?: string;
  rentalRate?: number;
  replacementCost?: number | null;
  isActive?: boolean;
  categoryId?: string | null;
  brandId?: string | null;
  unitId?: string | null;
  tagIds?: string[];
  images?: Array<{
    url: string;
    altText?: string | null;
    sortOrder?: number;
    isPrimary?: boolean;
  }>;
  specifications?: Array<{
    key: string;
    value: string;
    sortOrder?: number;
  }>;
  attributeValues?: Array<{
    attributeId: string;
    value: string;
  }>;
}

export interface ProductIdParamDto {
  id: string;
}
