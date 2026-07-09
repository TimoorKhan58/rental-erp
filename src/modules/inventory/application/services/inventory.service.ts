import type { PaginatedResult } from "@/shared/domain/pagination";

import type { InventoryDto } from "../dtos/inventory.dto";
import type {
  CreateInventoryInput,
  InventoryIdParamInput,
  UpdateInventoryInput,
} from "../schemas/inventory.schemas";
import type { ListInventoryInput } from "../schemas/list-inventory.schema";
import { CreateInventoryService } from "./create-inventory.service";
import { DeleteInventoryService } from "./delete-inventory.service";
import { GetInventoryByIdService } from "./get-inventory-by-id.service";
import { ListInventoryService } from "./list-inventory.service";
import { UpdateInventoryService } from "./update-inventory.service";

export interface IInventoryService {
  getById(input: InventoryIdParamInput): Promise<InventoryDto>;
  list(input: ListInventoryInput): Promise<PaginatedResult<InventoryDto>>;
  create(input: CreateInventoryInput): Promise<InventoryDto>;
  update(
    input: InventoryIdParamInput,
    data: UpdateInventoryInput,
  ): Promise<InventoryDto>;
  delete(input: InventoryIdParamInput): Promise<void>;
}

export class InventoryService implements IInventoryService {
  constructor(
    private readonly getInventoryByIdService: GetInventoryByIdService,
    private readonly listInventoryService: ListInventoryService,
    private readonly createInventoryService: CreateInventoryService,
    private readonly updateInventoryService: UpdateInventoryService,
    private readonly deleteInventoryService: DeleteInventoryService,
  ) {}

  getById(input: InventoryIdParamInput): Promise<InventoryDto> {
    return this.getInventoryByIdService.execute(input);
  }

  list(input: ListInventoryInput): Promise<PaginatedResult<InventoryDto>> {
    return this.listInventoryService.execute(input);
  }

  create(input: CreateInventoryInput): Promise<InventoryDto> {
    return this.createInventoryService.execute(input);
  }

  update(
    input: InventoryIdParamInput,
    data: UpdateInventoryInput,
  ): Promise<InventoryDto> {
    return this.updateInventoryService.execute(input, data);
  }

  delete(input: InventoryIdParamInput): Promise<void> {
    return this.deleteInventoryService.execute(input);
  }
}
