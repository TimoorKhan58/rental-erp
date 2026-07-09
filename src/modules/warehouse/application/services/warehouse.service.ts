import type { PaginatedResult } from "@/shared/domain/pagination";

import type { WarehouseDto } from "../dtos/warehouse.dto";
import type {
  CreateWarehouseInput,
  WarehouseIdParamInput,
  UpdateWarehouseInput,
} from "../schemas/warehouse.schemas";
import type { ListWarehousesInput } from "../schemas/list-warehouses.schema";
import { CreateWarehouseService } from "./create-warehouse.service";
import { DeleteWarehouseService } from "./delete-warehouse.service";
import { GetWarehouseByIdService } from "./get-warehouse-by-id.service";
import { ListWarehousesService } from "./list-warehouses.service";
import { UpdateWarehouseService } from "./update-warehouse.service";

export interface IWarehouseService {
  getById(input: WarehouseIdParamInput): Promise<WarehouseDto>;
  list(input: ListWarehousesInput): Promise<PaginatedResult<WarehouseDto>>;
  create(input: CreateWarehouseInput): Promise<WarehouseDto>;
  update(
    input: WarehouseIdParamInput,
    data: UpdateWarehouseInput,
  ): Promise<WarehouseDto>;
  delete(input: WarehouseIdParamInput): Promise<void>;
}

export class WarehouseService implements IWarehouseService {
  constructor(
    private readonly getWarehouseByIdService: GetWarehouseByIdService,
    private readonly listWarehousesService: ListWarehousesService,
    private readonly createWarehouseService: CreateWarehouseService,
    private readonly updateWarehouseService: UpdateWarehouseService,
    private readonly deleteWarehouseService: DeleteWarehouseService,
  ) {}

  getById(input: WarehouseIdParamInput): Promise<WarehouseDto> {
    return this.getWarehouseByIdService.execute(input);
  }

  list(input: ListWarehousesInput): Promise<PaginatedResult<WarehouseDto>> {
    return this.listWarehousesService.execute(input);
  }

  create(input: CreateWarehouseInput): Promise<WarehouseDto> {
    return this.createWarehouseService.execute(input);
  }

  update(
    input: WarehouseIdParamInput,
    data: UpdateWarehouseInput,
  ): Promise<WarehouseDto> {
    return this.updateWarehouseService.execute(input, data);
  }

  delete(input: WarehouseIdParamInput): Promise<void> {
    return this.deleteWarehouseService.execute(input);
  }
}
