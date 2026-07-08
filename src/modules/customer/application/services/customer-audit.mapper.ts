import type { Customer } from "@/modules/customer/domain/customer.entity";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

export function toCustomerAuditValues(customer: Customer): AuditValues {
  const props = customer.toProps();

  return {
    id: props.id,
    customerCode: props.customerCode,
    name: props.name,
    phone: props.phone,
    cnic: props.cnic,
    address: props.address,
    notes: props.notes,
    isActive: props.isActive,
  };
}
