import type { Tag } from "@/modules/catalog/domain/tag.entity";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

export function toTagAuditValues(
  entity: Tag,
): AuditValues {
  const props = entity.toProps();

  return {
    id: props.id,
    name: props.name,
    color: props.color,
    isActive: props.isActive,
  };
}
