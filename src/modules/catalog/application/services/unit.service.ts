import type { PaginatedResult } from "@/shared/domain/pagination";

import type { UnitDto } from "../dtos/unit.dto";
import type {
  CreateUnitInput,
  UnitIdParamInput,
  UpdateUnitInput,
} from "../schemas/unit.schemas";
import type { ListUnitsInput } from "../schemas/list-units.schema";
import type { IUnitService } from "./unit-application-services.interface";
import type { CreateUnitService } from "./create-unit.service";
import type { DeleteUnitService } from "./delete-unit.service";
import type { GetUnitByIdService } from "./get-unit-by-id.service";
import type { ListUnitsService } from "./list-units.service";
import type { UpdateUnitService } from "./update-unit.service";

export class UnitService implements IUnitService {
  constructor(
    private readonly getByIdService: GetUnitByIdService,
    private readonly listService: ListUnitsService,
    private readonly createService: CreateUnitService,
    private readonly updateService: UpdateUnitService,
    private readonly deleteService: DeleteUnitService,
  ) {}

  getById(params: UnitIdParamInput): Promise<UnitDto> {
    return this.getByIdService.execute(params);
  }

  list(input: ListUnitsInput): Promise<PaginatedResult<UnitDto>> {
    return this.listService.execute(input);
  }

  create(input: CreateUnitInput): Promise<UnitDto> {
    return this.createService.execute(input);
  }

  update(
    params: UnitIdParamInput,
    input: UpdateUnitInput,
  ): Promise<UnitDto> {
    return this.updateService.execute(params, input);
  }

  delete(params: UnitIdParamInput): Promise<void> {
    return this.deleteService.execute(params);
  }
}
