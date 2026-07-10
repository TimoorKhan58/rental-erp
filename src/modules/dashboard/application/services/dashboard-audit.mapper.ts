import type { DashboardLayout } from "@/modules/dashboard/domain/dashboard-layout.entity";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

export function toDashboardLayoutAuditValues(
  layout: DashboardLayout,
): AuditValues {
  const props = layout.toProps();

  return {
    id: props.id,
    userId: props.userId,
    dashboardId: props.dashboardId,
    dashboardCode: props.dashboardCode,
    isCustomized: props.isCustomized,
    layout: props.layout,
  };
}
