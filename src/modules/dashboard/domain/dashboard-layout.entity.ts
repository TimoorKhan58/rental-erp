import type { DashboardId } from "@/shared/domain/ids";

import type { DashboardLayoutProps } from "./dashboard.types";

export class DashboardLayout {
  readonly id: string;
  readonly userId: string;
  readonly dashboardId: DashboardId;
  readonly dashboardCode: string;
  readonly isCustomized: boolean;
  readonly layout: DashboardLayoutProps["layout"];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: DashboardLayoutProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.dashboardId = props.dashboardId;
    this.dashboardCode = props.dashboardCode;
    this.isCustomized = props.isCustomized;
    this.layout = props.layout;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: DashboardLayoutProps): DashboardLayout {
    return new DashboardLayout(props);
  }

  toProps(): DashboardLayoutProps {
    return {
      id: this.id,
      userId: this.userId,
      dashboardId: this.dashboardId,
      dashboardCode: this.dashboardCode,
      isCustomized: this.isCustomized,
      layout: this.layout,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
