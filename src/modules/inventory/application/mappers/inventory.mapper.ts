import type { Inventory } from "@/modules/inventory/domain/inventory.entity";
import type {
  CreateInventoryData,
  UpdateInventoryData,
} from "@/modules/inventory/domain/inventory.types";
import type { InventoryId, ProductId, WarehouseId } from "@/shared/domain/ids";

import type { InventoryDto } from "../dtos/inventory.dto";
import type {
  CreateInventoryInput,
  UpdateInventoryInput,
} from "../schemas/inventory.schemas";

export function toInventoryDto(inventory: Inventory): InventoryDto {
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

export function toCreateInventoryData(
  input: CreateInventoryInput,
): CreateInventoryData {
  return {
    productId: input.productId as ProductId,
    warehouseId: input.warehouseId as WarehouseId,
    quantityOnHand: input.quantityOnHand,
    reservedQuantity: input.reservedQuantity,
    minimumStock: input.minimumStock,
    maximumStock: input.maximumStock,
    isActive: input.isActive,
  };
}

export function toUpdateInventoryData(
  input: UpdateInventoryInput,
): UpdateInventoryData {
  return {
    quantityOnHand: input.quantityOnHand,
    reservedQuantity: input.reservedQuantity,
    minimumStock: input.minimumStock,
    maximumStock: input.maximumStock,
    isActive: input.isActive,
  };
}

export function toInventoryId(id: string): InventoryId {
  return id as InventoryId;
}

export function toProductId(id: string): ProductId {
  return id as ProductId;
}

export function toWarehouseId(id: string): WarehouseId {
  return id as WarehouseId;
}
