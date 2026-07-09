import type { IWarehouseRepository } from "@/modules/warehouse/domain/warehouse.repository.interface";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { WarehouseDto } from "../dtos/warehouse.dto";
import { toWarehouseListQuery } from "../mappers/warehouse-list.mapper";
import { toWarehouseDto } from "../mappers/warehouse.mapper";
import {
  ListWarehousesSchema,
  type ListWarehousesInput,
} from "../schemas/list-warehouses.schema";

export class ListWarehousesService {
  constructor(private readonly repository: IWarehouseRepository) {}

  async execute(
    input: ListWarehousesInput,
  ): Promise<PaginatedResult<WarehouseDto>> {
    const query = parseRequest(ListWarehousesSchema, input);
    const result = await this.repository.findPaged(toWarehouseListQuery(query));

    return {
      items: result.items.map(toWarehouseDto),
      meta: result.meta,
    };
  }
}
