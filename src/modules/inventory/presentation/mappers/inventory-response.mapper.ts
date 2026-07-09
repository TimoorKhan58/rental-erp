import type { InventoryDto } from "@/modules/inventory/application/dtos/inventory.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface InventoryResponse {
  id: string;
  productId: string;
  warehouseId: string;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumStock: number;
  maximumStock: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryListResponse {
  items: InventoryResponse[];
  meta: PaginationMeta;
}

export function toInventoryResponse(dto: InventoryDto): InventoryResponse {
  return {
    id: dto.id,
    productId: dto.productId,
    warehouseId: dto.warehouseId,
    quantityOnHand: dto.quantityOnHand,
    reservedQuantity: dto.reservedQuantity,
    availableQuantity: dto.availableQuantity,
    minimumStock: dto.minimumStock,
    maximumStock: dto.maximumStock,
    isActive: dto.isActive,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toInventoryListResponse(
  result: PaginatedResult<InventoryDto>,
): InventoryListResponse {
  return {
    items: result.items.map(toInventoryResponse),
    meta: result.meta,
  };
}
