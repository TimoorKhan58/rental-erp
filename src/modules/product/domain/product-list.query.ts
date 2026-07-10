import type { BrandId, CategoryId, ProductTagId } from "@/shared/domain/ids";

export interface ProductListQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
  categoryId?: CategoryId;
  brandId?: BrandId;
  tagId?: ProductTagId;
}
