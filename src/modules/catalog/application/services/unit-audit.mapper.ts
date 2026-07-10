import type { Unit } from "@/modules/catalog/domain/unit.entity";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

export function toUnitAuditValues(
  entity: Unit,
): AuditValues {
  const props = entity.toProps();

  return {
    id: props.id,
    code: props.code,
    name: props.name,
    description: props.description,
    isActive: props.isActive,
  };
}
