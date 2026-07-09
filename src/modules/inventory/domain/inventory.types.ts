import type { ProductId, WarehouseId } from "@/shared/domain/ids";

export interface CreateInventoryData {
  productId: ProductId;
  warehouseId: WarehouseId;
  quantityOnHand: number;
  reservedQuantity?: number;
  minimumStock?: number;
  maximumStock?: number | null;
  isActive?: boolean;
}

export interface UpdateInventoryData {
  quantityOnHand?: number;
  reservedQuantity?: number;
  minimumStock?: number;
  maximumStock?: number | null;
  isActive?: boolean;
}
