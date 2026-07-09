export interface StockMovementDto {
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

export interface CreateStockMovementDto {
  inventoryId: string;
  movementType: string;
  quantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  remarks?: string;
}

export interface StockMovementIdParamDto {
  id: string;
}
