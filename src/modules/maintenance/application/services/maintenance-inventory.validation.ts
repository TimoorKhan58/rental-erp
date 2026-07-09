import type { Inventory } from "@/modules/inventory/domain/inventory.entity";
import {
  MaintenanceInvalidInventoryError,
  validateQuantityAgainstAvailable,
} from "@/modules/maintenance/domain";
import { UnprocessableError } from "@/shared/infrastructure/errors";

export function validateInventoryForMaintenance(
  inventory: Inventory,
  productId: string,
  warehouseId: string,
  quantity: number,
): void {
  if (!inventory.isActive) {
    throw new UnprocessableError({
      message: "Inventory is inactive",
      details: { inventoryId: inventory.id },
    });
  }

  if (inventory.productId !== productId) {
    throw new UnprocessableError({
      message: "Product does not match inventory record",
      details: { productId },
    });
  }

  if (inventory.warehouseId !== warehouseId) {
    throw new UnprocessableError({
      message: "Warehouse does not match inventory record",
      details: { warehouseId },
    });
  }

  try {
    validateQuantityAgainstAvailable(
      quantity,
      inventory.availableQuantity,
      inventory.id,
    );
  } catch (error) {
    if (error instanceof MaintenanceInvalidInventoryError) {
      throw new UnprocessableError({
        message: error.message,
        details:
          error.inventoryId !== undefined
            ? { inventoryId: error.inventoryId }
            : undefined,
      });
    }

    throw error;
  }
}
