import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { InventorySummaryDto } from "../dtos/inventory-summary.dto";
import { toInventorySummaryDto } from "../dtos/inventory-summary.dto";
import { toInventorySummaryQuery } from "../mappers/inventory-summary.mapper";
import {
  GetInventorySummarySchema,
  type GetInventorySummaryInput,
} from "../schemas/get-inventory-summary.schema";

export class GetInventorySummaryService {
  constructor(private readonly inventoryRepository: IInventoryRepository) {}

  async execute(input: GetInventorySummaryInput): Promise<InventorySummaryDto> {
    const query = parseRequest(GetInventorySummarySchema, input);
    const summaryQuery = toInventorySummaryQuery(query);
    const result =
      await this.inventoryRepository.findSummaryStats(summaryQuery);

    return toInventorySummaryDto(result);
  }
}
