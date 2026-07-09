import type { PaginatedResult } from "@/shared/domain/pagination";

import type { RepairDto } from "../dtos/repair.dto";
import type {
  CreateRepairInput,
  RepairIdParamInput,
  UpdateRepairInput,
} from "../schemas/repair.schemas";
import type { ListRepairsInput } from "../schemas/repair.schemas";
import type { CancelRepairService } from "./cancel-repair.service";
import type { CompleteRepairService } from "./complete-repair.service";
import type { CreateRepairService } from "./create-repair.service";
import type { GetRepairByIdService } from "./get-repair-by-id.service";
import type { ListRepairsService } from "./list-repairs.service";
import type { StartRepairService } from "./start-repair.service";
import type { UpdateRepairService } from "./update-repair.service";

export interface RepairApplicationServices {
  getRepairById: GetRepairByIdService;
  listRepairs: ListRepairsService;
  createRepair: CreateRepairService;
  updateRepair: UpdateRepairService;
  startRepair: StartRepairService;
  completeRepair: CompleteRepairService;
  cancelRepair: CancelRepairService;
}

export interface IRepairService {
  getById(params: RepairIdParamInput): Promise<RepairDto>;
  list(input: ListRepairsInput): Promise<PaginatedResult<RepairDto>>;
  create(input: CreateRepairInput): Promise<RepairDto>;
  update(
    params: RepairIdParamInput,
    input: UpdateRepairInput,
  ): Promise<RepairDto>;
  start(params: RepairIdParamInput): Promise<RepairDto>;
  complete(params: RepairIdParamInput): Promise<RepairDto>;
  cancel(params: RepairIdParamInput): Promise<RepairDto>;
}

export type RepairServiceResolver = (
  ctx: import("@/shared/application/context").ExecutionContext,
) => RepairApplicationServices;
