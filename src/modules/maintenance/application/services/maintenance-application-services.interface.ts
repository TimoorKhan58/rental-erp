import type { PaginatedResult } from "@/shared/domain/pagination";

import type { MaintenanceDto } from "../dtos/maintenance.dto";
import type {
  CreateMaintenanceInput,
  MaintenanceIdParamInput,
  UpdateMaintenanceInput,
} from "../schemas/maintenance.schemas";
import type { ListMaintenancesInput } from "../schemas/maintenance.schemas";
import type { CancelMaintenanceService } from "./cancel-maintenance.service";
import type { CompleteMaintenanceService } from "./complete-maintenance.service";
import type { CreateMaintenanceService } from "./create-maintenance.service";
import type { GetMaintenanceByIdService } from "./get-maintenance-by-id.service";
import type { ListMaintenancesService } from "./list-maintenances.service";
import type { StartMaintenanceService } from "./start-maintenance.service";
import type { UpdateMaintenanceService } from "./update-maintenance.service";

export interface MaintenanceApplicationServices {
  getMaintenanceById: GetMaintenanceByIdService;
  listMaintenances: ListMaintenancesService;
  createMaintenance: CreateMaintenanceService;
  updateMaintenance: UpdateMaintenanceService;
  startMaintenance: StartMaintenanceService;
  completeMaintenance: CompleteMaintenanceService;
  cancelMaintenance: CancelMaintenanceService;
}

export interface IMaintenanceService {
  getById(params: MaintenanceIdParamInput): Promise<MaintenanceDto>;
  list(input: ListMaintenancesInput): Promise<PaginatedResult<MaintenanceDto>>;
  create(input: CreateMaintenanceInput): Promise<MaintenanceDto>;
  update(
    params: MaintenanceIdParamInput,
    input: UpdateMaintenanceInput,
  ): Promise<MaintenanceDto>;
  start(params: MaintenanceIdParamInput): Promise<MaintenanceDto>;
  complete(params: MaintenanceIdParamInput): Promise<MaintenanceDto>;
  cancel(params: MaintenanceIdParamInput): Promise<MaintenanceDto>;
}

export type MaintenanceServiceResolver = (
  ctx: import("@/shared/application/context").ExecutionContext,
) => MaintenanceApplicationServices;
