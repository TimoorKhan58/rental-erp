import type { PaginatedResult } from "@/shared/domain/pagination";

import type { RepairDto } from "../dtos/repair.dto";
import type {
  CreateRepairInput,
  RepairIdParamInput,
  UpdateRepairInput,
} from "../schemas/repair.schemas";
import type { ListRepairsInput } from "../schemas/repair.schemas";
import type { IRepairService } from "./repair-application-services.interface";
import type { CancelRepairService } from "./cancel-repair.service";
import type { CompleteRepairService } from "./complete-repair.service";
import type { CreateRepairService } from "./create-repair.service";
import type { GetRepairByIdService } from "./get-repair-by-id.service";
import type { ListRepairsService } from "./list-repairs.service";
import type { StartRepairService } from "./start-repair.service";
import type { UpdateRepairService } from "./update-repair.service";

export class RepairService implements IRepairService {
  constructor(
    private readonly getRepairById: GetRepairByIdService,
    private readonly listRepairs: ListRepairsService,
    private readonly createRepair: CreateRepairService,
    private readonly updateRepair: UpdateRepairService,
    private readonly startRepair: StartRepairService,
    private readonly completeRepair: CompleteRepairService,
    private readonly cancelRepair: CancelRepairService,
  ) {}

  getById(params: RepairIdParamInput): Promise<RepairDto> {
    return this.getRepairById.execute(params);
  }

  list(input: ListRepairsInput): Promise<PaginatedResult<RepairDto>> {
    return this.listRepairs.execute(input);
  }

  create(input: CreateRepairInput): Promise<RepairDto> {
    return this.createRepair.execute(input);
  }

  update(
    params: RepairIdParamInput,
    input: UpdateRepairInput,
  ): Promise<RepairDto> {
    return this.updateRepair.execute(params, input);
  }

  start(params: RepairIdParamInput): Promise<RepairDto> {
    return this.startRepair.execute(params);
  }

  complete(params: RepairIdParamInput): Promise<RepairDto> {
    return this.completeRepair.execute(params);
  }

  cancel(params: RepairIdParamInput): Promise<RepairDto> {
    return this.cancelRepair.execute(params);
  }
}
