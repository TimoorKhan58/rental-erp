import type { Supplier } from "@/modules/supplier/domain/supplier.entity";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

export function toSupplierAuditValues(supplier: Supplier): AuditValues {
  const props = supplier.toProps();

  return {
    id: props.id,
    supplierCode: props.supplierCode,
    name: props.name,
    phone: props.phone,
    email: props.email,
    address: props.address,
    notes: props.notes,
    isActive: props.isActive,
  };
}
