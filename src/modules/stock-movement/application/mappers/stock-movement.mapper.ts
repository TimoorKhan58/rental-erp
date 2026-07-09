import type { StockMovement } from "@/modules/stock-movement/domain/stock-movement.entity";
import type { CreateStockMovementData } from "@/modules/stock-movement/domain/stock-movement.types";
import type {
  InventoryId,
  ProductId,
  StockMovementId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

import type { StockMovementDto } from "../dtos/stock-movement.dto";
import type { CreateStockMovementInput } from "../schemas/stock-movement.schemas";

export function toStockMovementDto(movement: StockMovement): StockMovementDto {
  const props = movement.toProps();

  return {
    id: props.id,
    inventoryId: props.inventoryId,
    productId: props.productId,
    warehouseId: props.warehouseId,
    movementType: props.movementType,
    quantity: props.quantity,
    previousQuantity: props.previousQuantity,
    newQuantity: props.newQuantity,
    referenceType: props.referenceType,
    referenceId: props.referenceId,
    remarks: props.remarks,
    createdAt: props.createdAt.toISOString(),
    createdById: props.createdById,
  };
}

export function toCreateStockMovementData(
  input: CreateStockMovementInput,
  inventory: {
    id: InventoryId;
    productId: ProductId;
    warehouseId: WarehouseId;
  },
  effect: {
    previousQuantity: number;
    newQuantity: number;
  },
  createdById: UserId,
): CreateStockMovementData {
  return {
    inventoryId: inventory.id,
    productId: inventory.productId,
    warehouseId: inventory.warehouseId,
    movementType: input.movementType,
    quantity: input.quantity,
    previousQuantity: effect.previousQuantity,
    newQuantity: effect.newQuantity,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    remarks: input.remarks,
    createdById,
  };
}

export function toStockMovementId(id: string): StockMovementId {
  return id as StockMovementId;
}

export function toInventoryId(id: string): InventoryId {
  return id as InventoryId;
}

export function toUserId(id: string): UserId {
  return id as UserId;
}
