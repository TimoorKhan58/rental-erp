import { Inventory } from "@/modules/inventory/domain/inventory.entity";
import type { CreateInventoryData } from "@/modules/inventory/domain/inventory.types";
import type { InventoryId, ProductId, WarehouseId } from "@/shared/domain/ids";

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

export const VALID_CREATE_INPUT = {
  productId: PRODUCT_ID,
  warehouseId: WAREHOUSE_ID,
  quantityOnHand: 100,
  reservedQuantity: 10,
  minimumStock: 5,
  maximumStock: 500,
};

export function buildCreateInventoryData(
  override: Partial<CreateInventoryData> = {},
): CreateInventoryData {
  return {
    productId: PRODUCT_ID,
    warehouseId: WAREHOUSE_ID,
    quantityOnHand: VALID_CREATE_INPUT.quantityOnHand,
    reservedQuantity: VALID_CREATE_INPUT.reservedQuantity,
    minimumStock: VALID_CREATE_INPUT.minimumStock,
    maximumStock: VALID_CREATE_INPUT.maximumStock,
    isActive: true,
    ...override,
  };
}

export function buildInventoryEntity(
  override: Partial<ReturnType<typeof Inventory.create>> & {
    id?: InventoryId;
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): Inventory {
  const created = Inventory.create(buildCreateInventoryData());
  const now = new Date("2026-01-15T10:00:00.000Z");

  return Inventory.reconstitute({
    id: override.id ?? INVENTORY_ID,
    productId: override.productId ?? created.productId,
    warehouseId: override.warehouseId ?? created.warehouseId,
    quantityOnHand: override.quantityOnHand ?? created.quantityOnHand,
    reservedQuantity: override.reservedQuantity ?? created.reservedQuantity,
    minimumStock: override.minimumStock ?? created.minimumStock,
    maximumStock: override.maximumStock ?? created.maximumStock,
    isActive: override.isActive ?? created.isActive,
    createdAt: override.createdAt ?? now,
    updatedAt: override.updatedAt ?? now,
  });
}

export function buildInventoryDtoFromEntity(inventory: Inventory) {
  const props = inventory.toProps();

  return {
    id: props.id,
    productId: props.productId,
    warehouseId: props.warehouseId,
    quantityOnHand: props.quantityOnHand,
    reservedQuantity: props.reservedQuantity,
    availableQuantity: props.availableQuantity,
    minimumStock: props.minimumStock,
    maximumStock: props.maximumStock,
    isActive: props.isActive,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}
