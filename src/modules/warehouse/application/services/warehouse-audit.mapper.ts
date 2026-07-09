import type { Warehouse } from "@/modules/warehouse/domain/warehouse.entity";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

export function toWarehouseAuditValues(warehouse: Warehouse): AuditValues {
  const props = warehouse.toProps();

  return {
    id: props.id,
    warehouseCode: props.warehouseCode,
    name: props.name,
    description: props.description,
    address: props.address,
    contactPerson: props.contactPerson,
    phone: props.phone,
    isActive: props.isActive,
  };
}
