import type { StockMovementDto } from "@/modules/stock-movement/application/dtos/stock-movement.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface StockMovementResponse {
  id: string;
  inventoryId: string;
  productId: string;
  warehouseId: string;
  movementType: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  referenceType: string | null;
  referenceId: string | null;
  remarks: string;
  createdAt: string;
  createdById: string;
}

export interface StockMovementListResponse {
  items: StockMovementResponse[];
  meta: PaginationMeta;
}

export function toStockMovementResponse(
  dto: StockMovementDto,
): StockMovementResponse {
  return {
    id: dto.id,
    inventoryId: dto.inventoryId,
    productId: dto.productId,
    warehouseId: dto.warehouseId,
    movementType: dto.movementType,
    quantity: dto.quantity,
    previousQuantity: dto.previousQuantity,
    newQuantity: dto.newQuantity,
    referenceType: dto.referenceType,
    referenceId: dto.referenceId,
    remarks: dto.remarks,
    createdAt: dto.createdAt,
    createdById: dto.createdById,
  };
}

export function toStockMovementListResponse(
  result: PaginatedResult<StockMovementDto>,
): StockMovementListResponse {
  return {
    items: result.items.map(toStockMovementResponse),
    meta: result.meta,
  };
}
