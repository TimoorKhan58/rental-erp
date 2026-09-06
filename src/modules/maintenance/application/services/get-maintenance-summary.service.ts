import type { IMaintenanceRepository } from "@/modules/maintenance/domain/maintenance.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { MaintenanceSummaryDto } from "../dtos/maintenance-summary.dto";
import { toMaintenanceSummaryDto } from "../dtos/maintenance-summary.dto";
import { toMaintenanceSummaryQuery } from "../mappers/maintenance-summary.mapper";
import {
  GetMaintenanceSummarySchema,
  type GetMaintenanceSummaryInput,
} from "../schemas/get-maintenance-summary.schema";

export class GetMaintenanceSummaryService {
  constructor(private readonly maintenanceRepository: IMaintenanceRepository) {}

  async execute(
    input: GetMaintenanceSummaryInput,
  ): Promise<MaintenanceSummaryDto> {
    const query = parseRequest(GetMaintenanceSummarySchema, input);
    const summaryQuery = toMaintenanceSummaryQuery(query);
    const result =
      await this.maintenanceRepository.findSummaryStats(summaryQuery);

    return toMaintenanceSummaryDto(result);
  }
}
