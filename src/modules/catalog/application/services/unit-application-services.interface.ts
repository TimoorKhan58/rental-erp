import type { PaginatedResult } from "@/shared/domain/pagination";

import type { UnitDto } from "../dtos/unit.dto";
import type {
  CreateUnitInput,
  UnitIdParamInput,
  UpdateUnitInput,
} from "../schemas/unit.schemas";
import type { ListUnitsInput } from "../schemas/list-units.schema";
import type { CreateUnitService } from "./create-unit.service";
import type { DeleteUnitService } from "./delete-unit.service";
import type { GetUnitByIdService } from "./get-unit-by-id.service";
import type { ListUnitsService } from "./list-units.service";
import type { UpdateUnitService } from "./update-unit.service";

export interface UnitApplicationServices {
  getUnitById: GetUnitByIdService;
  listUnits: ListUnitsService;
  createUnit: CreateUnitService;
  updateUnit: UpdateUnitService;
  deleteUnit: DeleteUnitService;
}

export interface IUnitService {
  getById(params: UnitIdParamInput): Promise<UnitDto>;
  list(input: ListUnitsInput): Promise<PaginatedResult<UnitDto>>;
  create(input: CreateUnitInput): Promise<UnitDto>;
  update(
    params: UnitIdParamInput,
    input: UpdateUnitInput,
  ): Promise<UnitDto>;
  delete(params: UnitIdParamInput): Promise<void>;
}
