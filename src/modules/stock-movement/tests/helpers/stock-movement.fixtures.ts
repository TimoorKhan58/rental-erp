import { StockMovement } from "@/modules/stock-movement/domain/stock-movement.entity";
import type { CreateStockMovementData } from "@/modules/stock-movement/domain/stock-movement.types";
import type {
  InventoryId,
  ProductId,
  StockMovementId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

export const STOCK_MOVEMENT_ID =
  "990e8400-e29b-41d4-a716-446655440000" as StockMovementId;

export const OTHER_STOCK_MOVEMENT_ID =
  "990e8400-e29b-41d4-a716-446655440001" as StockMovementId;

export const INVENTORY_ID =
  "880e8400-e29b-41d4-a716-446655440000" as InventoryId;

export const OTHER_INVENTORY_ID =
  "880e8400-e29b-41d4-a716-446655440001" as InventoryId;

export const PRODUCT_ID =
  "880e8400-e29b-41d4-a716-446655440010" as ProductId;

export const OTHER_PRODUCT_ID =
  "880e8400-e29b-41d4-a716-446655440011" as ProductId;

export const WAREHOUSE_ID =
  "880e8400-e29b-41d4-a716-446655440020" as WarehouseId;

export const OTHER_WAREHOUSE_ID =
  "880e8400-e29b-41d4-a716-446655440021" as WarehouseId;

export const USER_ID =
  "770e8400-e29b-41d4-a716-446655440000" as UserId;

export const OTHER_USER_ID =
  "770e8400-e29b-41d4-a716-446655440001" as UserId;

export const VALID_CREATE_INPUT = {
  inventoryId: INVENTORY_ID,
  movementType: "IN" as const,
  quantity: 10,
  referenceType: "purchase-order",
  referenceId: "PO-001",
  remarks: "Initial stock receipt",
};

export function buildCreateStockMovementData(
  override: Partial<CreateStockMovementData> = {},
): CreateStockMovementData {
  return {
    inventoryId: INVENTORY_ID,
    productId: PRODUCT_ID,
    warehouseId: WAREHOUSE_ID,
    movementType: "IN",
    quantity: 10,
    previousQuantity: 100,
    newQuantity: 110,
    referenceType: "purchase-order",
    referenceId: "PO-001",
    remarks: "Initial stock receipt",
    createdById: USER_ID,
    ...override,
  };
}

export function buildStockMovementEntity(
  override: Partial<CreateStockMovementData> & {
    id?: StockMovementId;
    createdAt?: Date;
  } = {},
): StockMovement {
  const created = StockMovement.create(buildCreateStockMovementData(override));
  const now = new Date("2026-01-15T10:00:00.000Z");

  return StockMovement.reconstitute({
    id: override.id ?? STOCK_MOVEMENT_ID,
    ...created,
    createdAt: override.createdAt ?? now,
  });
}

export function buildStockMovementDtoFromEntity(movement: StockMovement) {
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
