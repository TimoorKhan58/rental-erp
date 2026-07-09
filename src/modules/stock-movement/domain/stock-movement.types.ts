import type {
  InventoryId,
  ProductId,
  StockMovementId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

import type { StockMovementType } from "./stock-movement.constants";

export interface CreateStockMovementData {
  inventoryId: InventoryId;
  productId: ProductId;
  warehouseId: WarehouseId;
  movementType: StockMovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  remarks?: string;
  createdById: UserId;
}

export interface StockMovementProps {
  id: StockMovementId;
  inventoryId: InventoryId;
  productId: ProductId;
  warehouseId: WarehouseId;
  movementType: StockMovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  referenceType: string | null;
  referenceId: string | null;
  remarks: string;
  createdAt: Date;
  createdById: UserId;
}
