import { Inventory } from "@/modules/inventory/domain/inventory.entity";
import type {
  CreateInventoryData,
  UpdateInventoryData,
} from "@/modules/inventory/domain/inventory.types";
import type { InventoryId, ProductId, WarehouseId } from "@/shared/domain/ids";

export function toInventoryDomain(record: {
  id: string;
  productId: string;
  warehouseId: string;
  quantityOnHand: number;
  reservedQuantity: number;
  minimumStock: number;
  maximumStock: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Inventory {
  return Inventory.reconstitute({
    id: record.id as InventoryId,
    productId: record.productId as ProductId,
    warehouseId: record.warehouseId as WarehouseId,
    quantityOnHand: record.quantityOnHand,
    reservedQuantity: record.reservedQuantity,
    minimumStock: record.minimumStock,
    maximumStock: record.maximumStock,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toInventoryCreateInput(data: CreateInventoryData) {
  const normalized = Inventory.create(data);

  return {
    productId: normalized.productId,
    warehouseId: normalized.warehouseId,
    quantityOnHand: normalized.quantityOnHand,
    reservedQuantity: normalized.reservedQuantity,
    minimumStock: normalized.minimumStock,
    maximumStock: normalized.maximumStock,
    isActive: normalized.isActive,
  };
}

export function toInventoryUpdateInput(data: UpdateInventoryData) {
  return {
    ...(data.quantityOnHand !== undefined
      ? { quantityOnHand: data.quantityOnHand }
      : {}),
    ...(data.reservedQuantity !== undefined
      ? { reservedQuantity: data.reservedQuantity }
      : {}),
    ...(data.minimumStock !== undefined
      ? { minimumStock: data.minimumStock }
      : {}),
    ...(data.maximumStock !== undefined
      ? { maximumStock: data.maximumStock }
      : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
  };
}
