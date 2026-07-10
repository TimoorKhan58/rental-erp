import type { Attribute } from "@/modules/catalog/domain/attribute.entity";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

export function toAttributeAuditValues(
  entity: Attribute,
): AuditValues {
  const props = entity.toProps();

  return {
    id: props.id,
    name: props.name,
    dataType: props.dataType,
    isActive: props.isActive,
  };
}
