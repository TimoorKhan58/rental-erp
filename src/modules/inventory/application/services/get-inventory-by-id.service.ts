import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { InventoryDto } from "../dtos/inventory.dto";
import { toInventoryDto, toInventoryId } from "../mappers/inventory.mapper";
import {
  InventoryIdParamSchema,
  type InventoryIdParamInput,
} from "../schemas/inventory.schemas";

export class GetInventoryByIdService {
  constructor(private readonly repository: IInventoryRepository) {}

  async execute(input: InventoryIdParamInput): Promise<InventoryDto> {
    const params = parseRequest(InventoryIdParamSchema, input);
    const inventory = await this.repository.findById(toInventoryId(params.id));

    if (inventory === null) {
      throw new NotFoundError({
        message: "Inventory not found",
        details: { id: params.id },
      });
    }

    return toInventoryDto(inventory);
  }
}
