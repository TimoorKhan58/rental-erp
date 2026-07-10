import type { ExecutionContext } from "@/shared/application/context";

import type { DashboardLayoutDto } from "../dtos/dashboard.dto";
import type {
  CreateDashboardLayoutInput,
  UpdateDashboardLayoutInput,
} from "../schemas/dashboard.schemas";
import type { IDashboardService } from "./dashboard-application-services.interface";
import { CreateDashboardLayoutService } from "./create-dashboard-layout.service";
import { GetDashboardLayoutService } from "./get-dashboard-layout.service";
import { ResetDashboardLayoutService } from "./reset-dashboard-layout.service";
import { UpdateDashboardLayoutService } from "./update-dashboard-layout.service";

function resolveUserId(ctx: ExecutionContext): string {
  if (ctx.request.userId === undefined) {
    throw new Error("Authenticated user id is required");
  }

  return ctx.request.userId;
}

export class DashboardService implements IDashboardService {
  constructor(
    private readonly getDashboardLayoutService: GetDashboardLayoutService,
    private readonly createDashboardLayoutService: CreateDashboardLayoutService,
    private readonly updateDashboardLayoutService: UpdateDashboardLayoutService,
    private readonly resetDashboardLayoutService: ResetDashboardLayoutService,
  ) {}

  getLayout(ctx: ExecutionContext): Promise<DashboardLayoutDto> {
    return this.getDashboardLayoutService.execute(resolveUserId(ctx));
  }

  createLayout(
    input: CreateDashboardLayoutInput,
    ctx: ExecutionContext,
  ): Promise<DashboardLayoutDto> {
    return this.createDashboardLayoutService.execute(resolveUserId(ctx), input);
  }

  updateLayout(
    input: UpdateDashboardLayoutInput,
    ctx: ExecutionContext,
  ): Promise<DashboardLayoutDto> {
    return this.updateDashboardLayoutService.execute(resolveUserId(ctx), input);
  }

  resetLayout(ctx: ExecutionContext): Promise<DashboardLayoutDto> {
    return this.resetDashboardLayoutService.execute(resolveUserId(ctx));
  }
}
