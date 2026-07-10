import type { Brand } from "@/modules/catalog/domain/brand.entity";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

export function toBrandAuditValues(
  entity: Brand,
): AuditValues {
  const props = entity.toProps();

  return {
    id: props.id,
    name: props.name,
    description: props.description,
    isActive: props.isActive,
  };
}
