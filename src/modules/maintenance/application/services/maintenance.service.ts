import type { PaginatedResult } from "@/shared/domain/pagination";

import type { MaintenanceDto } from "../dtos/maintenance.dto";
import type {
  CreateMaintenanceInput,
  MaintenanceIdParamInput,
  UpdateMaintenanceInput,
} from "../schemas/maintenance.schemas";
import type { ListMaintenancesInput } from "../schemas/maintenance.schemas";
import type { IMaintenanceService } from "./maintenance-application-services.interface";
import type { CancelMaintenanceService } from "./cancel-maintenance.service";
import type { CompleteMaintenanceService } from "./complete-maintenance.service";
import type { CreateMaintenanceService } from "./create-maintenance.service";
import type { GetMaintenanceByIdService } from "./get-maintenance-by-id.service";
import type { ListMaintenancesService } from "./list-maintenances.service";
import type { StartMaintenanceService } from "./start-maintenance.service";
import type { UpdateMaintenanceService } from "./update-maintenance.service";

export class MaintenanceService implements IMaintenanceService {
  constructor(
    private readonly getMaintenanceById: GetMaintenanceByIdService,
    private readonly listMaintenances: ListMaintenancesService,
    private readonly createMaintenance: CreateMaintenanceService,
    private readonly updateMaintenance: UpdateMaintenanceService,
    private readonly startMaintenance: StartMaintenanceService,
    private readonly completeMaintenance: CompleteMaintenanceService,
    private readonly cancelMaintenance: CancelMaintenanceService,
  ) {}

  getById(params: MaintenanceIdParamInput): Promise<MaintenanceDto> {
    return this.getMaintenanceById.execute(params);
  }

  list(input: ListMaintenancesInput): Promise<PaginatedResult<MaintenanceDto>> {
    return this.listMaintenances.execute(input);
  }

  create(input: CreateMaintenanceInput): Promise<MaintenanceDto> {
    return this.createMaintenance.execute(input);
  }

  update(
    params: MaintenanceIdParamInput,
    input: UpdateMaintenanceInput,
  ): Promise<MaintenanceDto> {
    return this.updateMaintenance.execute(params, input);
  }

  start(params: MaintenanceIdParamInput): Promise<MaintenanceDto> {
    return this.startMaintenance.execute(params);
  }

  complete(params: MaintenanceIdParamInput): Promise<MaintenanceDto> {
    return this.completeMaintenance.execute(params);
  }

  cancel(params: MaintenanceIdParamInput): Promise<MaintenanceDto> {
    return this.cancelMaintenance.execute(params);
  }
}
