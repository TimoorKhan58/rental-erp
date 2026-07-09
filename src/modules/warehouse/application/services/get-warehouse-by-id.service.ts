import type { IWarehouseRepository } from "@/modules/warehouse/domain/warehouse.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { WarehouseDto } from "../dtos/warehouse.dto";
import { toWarehouseDto, toWarehouseId } from "../mappers/warehouse.mapper";
import {
  WarehouseIdParamSchema,
  type WarehouseIdParamInput,
} from "../schemas/warehouse.schemas";

export class GetWarehouseByIdService {
  constructor(private readonly repository: IWarehouseRepository) {}

  async execute(input: WarehouseIdParamInput): Promise<WarehouseDto> {
    const params = parseRequest(WarehouseIdParamSchema, input);
    const warehouse = await this.repository.findById(toWarehouseId(params.id));

    if (warehouse === null) {
      throw new NotFoundError({
        message: "Warehouse not found",
        details: { id: params.id },
      });
    }

    return toWarehouseDto(warehouse);
  }
}
