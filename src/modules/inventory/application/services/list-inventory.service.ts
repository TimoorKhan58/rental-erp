import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { InventoryDto } from "../dtos/inventory.dto";
import { toInventoryListQuery } from "../mappers/inventory-list.mapper";
import { toInventoryDto } from "../mappers/inventory.mapper";
import {
  ListInventorySchema,
  type ListInventoryInput,
} from "../schemas/list-inventory.schema";

export class ListInventoryService {
  constructor(private readonly repository: IInventoryRepository) {}

  async execute(
    input: ListInventoryInput,
  ): Promise<PaginatedResult<InventoryDto>> {
    const query = parseRequest(ListInventorySchema, input);
    const result = await this.repository.findPaged(toInventoryListQuery(query));

    return {
      items: result.items.map(toInventoryDto),
      meta: result.meta,
    };
  }
}
