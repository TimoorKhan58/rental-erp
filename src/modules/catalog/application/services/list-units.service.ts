import type { IUnitRepository } from "@/modules/catalog/domain/unit.repository.interface";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { UnitDto } from "../dtos/unit.dto";
import {
  toUnitDto,
  toUnitListQuery,
} from "../mappers/unit.mapper";
import {
  ListUnitsSchema,
  type ListUnitsInput,
} from "../schemas/list-units.schema";

export class ListUnitsService {
  constructor(private readonly repository: IUnitRepository) {}

  async execute(
    input: ListUnitsInput,
  ): Promise<PaginatedResult<UnitDto>> {
    const query = parseRequest(ListUnitsSchema, input);
    const result = await this.repository.findPaged(toUnitListQuery(query));

    return {
      items: result.items.map(toUnitDto),
      meta: result.meta,
    };
  }
}
