import type { PaginatedResult } from "@/shared/domain/pagination";

import type { RepairDto } from "../dtos/repair.dto";
import { toRepairListQuery } from "../mappers/repair-list.mapper";
import { toRepairDto } from "../mappers/repair.mapper";
import type { ListRepairsInput } from "../schemas/repair.schemas";
import type { IRepairRepository } from "@/modules/repair/domain";

export class ListRepairsService {
  constructor(private readonly repository: IRepairRepository) {}

  async execute(input: ListRepairsInput): Promise<PaginatedResult<RepairDto>> {
    const query = toRepairListQuery(input);
    const result = await this.repository.findPaged(query);

    return {
      items: result.items.map(toRepairDto),
      meta: result.meta,
    };
  }
}
