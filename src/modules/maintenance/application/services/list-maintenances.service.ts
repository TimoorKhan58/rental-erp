import type { PaginatedResult } from "@/shared/domain/pagination";

import type { MaintenanceDto } from "../dtos/maintenance.dto";
import { toMaintenanceListQuery } from "../mappers/maintenance-list.mapper";
import { toMaintenanceDto } from "../mappers/maintenance.mapper";
import type { ListMaintenancesInput } from "../schemas/maintenance.schemas";
import type { IMaintenanceRepository } from "@/modules/maintenance/domain";

export class ListMaintenancesService {
  constructor(private readonly repository: IMaintenanceRepository) {}

  async execute(input: ListMaintenancesInput): Promise<PaginatedResult<MaintenanceDto>> {
    const query = toMaintenanceListQuery(input);
    const result = await this.repository.findPaged(query);

    return {
      items: result.items.map(toMaintenanceDto),
      meta: result.meta,
    };
  }
}
