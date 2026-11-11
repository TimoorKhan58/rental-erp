import type { IRepairRepository } from "@/modules/repair/domain/repair.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { RepairSummaryDto } from "../dtos/repair-summary.dto";
import { toRepairSummaryDto } from "../dtos/repair-summary.dto";
import { toRepairSummaryQuery } from "../mappers/repair-summary.mapper";
import {
  GetRepairSummarySchema,
  type GetRepairSummaryInput,
} from "../schemas/get-repair-summary.schema";

export class GetRepairSummaryService {
  constructor(private readonly repairRepository: IRepairRepository) {}

  async execute(input: GetRepairSummaryInput): Promise<RepairSummaryDto> {
    const query = parseRequest(GetRepairSummarySchema, input);
    const summaryQuery = toRepairSummaryQuery(query);
    const result = await this.repairRepository.findSummaryStats(summaryQuery);

    return toRepairSummaryDto(result);
  }
}
