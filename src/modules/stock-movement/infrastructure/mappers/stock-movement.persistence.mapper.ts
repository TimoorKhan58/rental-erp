import type { InventoryTransaction, Prisma } from "@/generated/prisma/client";
import { StockMovement } from "@/modules/stock-movement/domain/stock-movement.entity";
import type { StockMovementType } from "@/modules/stock-movement/domain/stock-movement.constants";
import type { CreateStockMovementData } from "@/modules/stock-movement/domain/stock-movement.types";
import type {
  InventoryId,
  ProductId,
  StockMovementId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

export function toStockMovementDomain(
  record: InventoryTransaction,
): StockMovement {
  return StockMovement.reconstitute({
    id: record.id as StockMovementId,
    inventoryId: record.inventoryId as InventoryId,
    productId: record.productId as ProductId,
    warehouseId: record.warehouseId as WarehouseId,
    movementType: record.movementType as StockMovementType,
    quantity: record.quantity,
    previousQuantity: record.previousQuantity,
    newQuantity: record.newQuantity,
    referenceType: record.referenceType,
    referenceId: record.referenceId,
    remarks: record.remarks,
    createdAt: record.createdAt,
    createdById: record.createdById as UserId,
  });
}

export function toStockMovementCreateInput(
  data: CreateStockMovementData,
): Prisma.InventoryTransactionCreateInput {
  return {
    inventory: {
      connect: { id: data.inventoryId },
    },
    productId: data.productId,
    warehouseId: data.warehouseId,
    movementType: data.movementType,
    quantity: data.quantity,
    previousQuantity: data.previousQuantity,
    newQuantity: data.newQuantity,
    referenceType: data.referenceType ?? null,
    referenceId: data.referenceId ?? null,
    remarks: data.remarks ?? "",
    createdBy: {
      connect: { id: data.createdById },
    },
  };
}
