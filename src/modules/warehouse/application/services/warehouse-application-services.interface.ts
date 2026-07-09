import type { WarehouseDto } from "../dtos/warehouse.dto";
import type {
  CreateWarehouseInput,
  WarehouseIdParamInput,
  UpdateWarehouseInput,
} from "../schemas/warehouse.schemas";
import type { ListWarehousesInput } from "../schemas/list-warehouses.schema";
import type { ExecutionContext } from "@/shared/application/context";
import type { PaginatedResult } from "@/shared/domain/pagination";

export interface WarehouseApplicationServices {
  getWarehouseById: {
    execute(input: WarehouseIdParamInput): Promise<WarehouseDto>;
  };
  listWarehouses: {
    execute(input: ListWarehousesInput): Promise<PaginatedResult<WarehouseDto>>;
  };
  createWarehouse: {
    execute(input: CreateWarehouseInput): Promise<WarehouseDto>;
  };
  updateWarehouse: {
    execute(
      params: WarehouseIdParamInput,
      input: UpdateWarehouseInput,
    ): Promise<WarehouseDto>;
  };
  deleteWarehouse: {
    execute(input: WarehouseIdParamInput): Promise<void>;
  };
}

export type WarehouseServiceResolver = (
  ctx: ExecutionContext,
) => WarehouseApplicationServices;
