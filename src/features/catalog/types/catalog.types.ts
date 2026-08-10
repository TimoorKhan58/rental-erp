import type { PaginationMeta } from "@/types/api";

export const CATALOG_TABS = [
  "categories",
  "brands",
  "units",
  "attributes",
  "tags",
] as const;
export type CatalogTab = (typeof CATALOG_TABS)[number];

export const ATTRIBUTE_DATA_TYPES = ["TEXT", "NUMBER", "BOOLEAN"] as const;
export type AttributeDataType = (typeof ATTRIBUTE_DATA_TYPES)[number];

export type CatalogListParams = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
  dataType?: AttributeDataType;
};

export type CategoryResponse = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BrandResponse = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UnitResponse = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AttributeResponse = {
  id: string;
  name: string;
  dataType: AttributeDataType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TagResponse = {
  id: string;
  name: string;
  color: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CatalogEntityResponse =
  | CategoryResponse
  | BrandResponse
  | UnitResponse
  | AttributeResponse
  | TagResponse;

export type CatalogListResponse<T> = {
  items: T[];
  meta: PaginationMeta;
};

export type CreateCategoryPayload = {
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export type CreateBrandPayload = CreateCategoryPayload;

export type CreateUnitPayload = {
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export type CreateAttributePayload = {
  name: string;
  dataType?: AttributeDataType;
  isActive?: boolean;
};

export type CreateTagPayload = {
  name: string;
  color?: string | null;
  isActive?: boolean;
};
