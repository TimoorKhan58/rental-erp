import type { Category } from "@/modules/catalog/domain/category.entity";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

export function toCategoryAuditValues(
  entity: Category,
): AuditValues {
  const props = entity.toProps();

  return {
    id: props.id,
    name: props.name,
    description: props.description,
    isActive: props.isActive,
  };
}
