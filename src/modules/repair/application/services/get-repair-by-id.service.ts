import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { RepairDto } from "../dtos/repair.dto";
import { toRepairDto, toRepairId } from "../mappers/repair.mapper";
import {
  RepairIdParamSchema,
  type RepairIdParamInput,
} from "../schemas/repair.schemas";
import type { IRepairRepository } from "@/modules/repair/domain";

export class GetRepairByIdService {
  constructor(private readonly repository: IRepairRepository) {}

  async execute(params: RepairIdParamInput): Promise<RepairDto> {
    const { id } = parseRequest(RepairIdParamSchema, params);
    const repair = await this.repository.findById(toRepairId(id));

    if (repair === null) {
      throw new NotFoundError({
        message: "Repair not found",
        details: { id },
      });
    }

    return toRepairDto(repair);
  }
}
