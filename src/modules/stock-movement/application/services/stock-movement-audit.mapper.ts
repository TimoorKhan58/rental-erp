import type { StockMovement } from "@/modules/stock-movement/domain/stock-movement.entity";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

export function toStockMovementAuditValues(
  movement: StockMovement,
): AuditValues {
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
    createdById: props.createdById,
  };
}
