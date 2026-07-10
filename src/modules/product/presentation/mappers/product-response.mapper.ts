import type { ProductDto } from "@/modules/product/application/dtos/product.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface ProductImageResponse {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductSpecificationResponse {
  id: string;
  key: string;
  value: string;
  sortOrder: number;
}

export interface ProductAttributeValueResponse {
  id: string;
  attributeId: string;
  value: string;
}

export interface ProductResponse {
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
}

export interface ProductListResponse {
  items: ProductResponse[];
  meta: PaginationMeta;
}

export function toProductResponse(dto: ProductDto): ProductResponse {
  return {
    id: dto.id,
    productCode: dto.productCode,
    name: dto.name,
    description: dto.description,
    unit: dto.unit,
    rentalRate: dto.rentalRate,
    replacementCost: dto.replacementCost,
    isActive: dto.isActive,
    categoryId: dto.categoryId,
    brandId: dto.brandId,
    unitId: dto.unitId,
    tags: dto.tags,
    images: dto.images,
    specifications: dto.specifications,
    attributeValues: dto.attributeValues,
    variantCount: dto.variantCount,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toProductListResponse(
  result: PaginatedResult<ProductDto>,
): ProductListResponse {
  return {
    items: result.items.map(toProductResponse),
    meta: result.meta,
  };
}
