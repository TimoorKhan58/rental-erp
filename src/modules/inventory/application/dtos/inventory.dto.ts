export interface InventoryDto {
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

export interface CreateInventoryDto {
  productId: string;
  warehouseId: string;
  quantityOnHand: number;
  reservedQuantity?: number;
  minimumStock?: number;
  maximumStock?: number | null;
  isActive?: boolean;
}

export interface UpdateInventoryDto {
  quantityOnHand?: number;
  reservedQuantity?: number;
  minimumStock?: number;
  maximumStock?: number | null;
  isActive?: boolean;
}

export interface InventoryIdParamDto {
  id: string;
}
