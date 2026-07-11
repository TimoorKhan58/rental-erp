import type { PaginationMeta } from "@/types/api";

export type ProductImageResponse = {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type ProductSpecificationResponse = {
  id: string;
  key: string;
  value: string;
  sortOrder: number;
};

export type ProductAttributeValueResponse = {
  id: string;
  attributeId: string;
  value: string;
};

export type ProductResponse = {
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
  images: ProductImageResponse[];
  specifications: ProductSpecificationResponse[];
  attributeValues: ProductAttributeValueResponse[];
  variantCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductListResponse = {
  items: ProductResponse[];
  meta: PaginationMeta;
};

export type ProductSortField =
  | "name"
  | "productCode"
  | "unit"
  | "rentalRate"
  | "replacementCost"
  | "categoryId"
  | "brandId"
  | "createdAt"
  | "updatedAt"
  | "isActive";

export type ListProductsParams = {
  page?: number;
  pageSize?: number;
  sortBy?: ProductSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
  categoryId?: string;
  brandId?: string;
  tagId?: string;
};

export type CreateProductPayload = {
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
};

export type UpdateProductPayload = {
  name?: string;
  description?: string | null;
  unit?: string;
  rentalRate?: number;
  replacementCost?: number | null;
  isActive?: boolean;
  categoryId?: string | null;
  brandId?: string | null;
  unitId?: string | null;
};
