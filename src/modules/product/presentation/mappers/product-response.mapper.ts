import type { ProductDto } from "@/modules/product/application/dtos/product.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface ProductResponse {
  id: string;
  productCode: string;
  name: string;
  description: string | null;
  unit: string;
  rentalRate: string;
  replacementCost: string | null;
  isActive: boolean;
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
