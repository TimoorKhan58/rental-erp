import type { AssetCategory } from "@/modules/asset/domain";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

export function toAssetCategoryAuditValues(
  category: AssetCategory,
): AuditValues {
  const props = category.toProps();

  return {
    id: props.id,
    name: props.name,
    description: props.description,
    isActive: props.isActive,
  };
}
