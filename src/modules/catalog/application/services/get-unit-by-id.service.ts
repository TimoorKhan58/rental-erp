import type { IUnitRepository } from "@/modules/catalog/domain/unit.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { UnitDto } from "../dtos/unit.dto";
import {
  toUnitDto,
  toUnitId,
} from "../mappers/unit.mapper";
import {
  UnitIdParamSchema,
  type UnitIdParamInput,
} from "../schemas/unit.schemas";

export class GetUnitByIdService {
  constructor(private readonly repository: IUnitRepository) {}

  async execute(input: UnitIdParamInput): Promise<UnitDto> {
    const params = parseRequest(UnitIdParamSchema, input);
    const entity = await this.repository.findById(toUnitId(params.id));

    if (entity === null) {
      throw new NotFoundError({
        message: "Unit of measure not found",
        details: { id: params.id },
      });
    }

    return toUnitDto(entity);
  }
}
