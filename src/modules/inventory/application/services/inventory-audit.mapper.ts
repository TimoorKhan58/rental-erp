import type { Inventory } from "@/modules/inventory/domain/inventory.entity";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

export function toInventoryAuditValues(inventory: Inventory): AuditValues {
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
  };
}
