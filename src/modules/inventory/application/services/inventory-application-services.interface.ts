import type { InventoryDto } from "../dtos/inventory.dto";
import type {
  CreateInventoryInput,
  InventoryIdParamInput,
  UpdateInventoryInput,
} from "../schemas/inventory.schemas";
import type { ListInventoryInput } from "../schemas/list-inventory.schema";
import type { ExecutionContext } from "@/shared/application/context";
import type { PaginatedResult } from "@/shared/domain/pagination";

export interface InventoryApplicationServices {
  getInventoryById: {
    execute(input: InventoryIdParamInput): Promise<InventoryDto>;
  };
  listInventory: {
    execute(input: ListInventoryInput): Promise<PaginatedResult<InventoryDto>>;
  };
  createInventory: {
    execute(input: CreateInventoryInput): Promise<InventoryDto>;
  };
  updateInventory: {
    execute(
      params: InventoryIdParamInput,
      input: UpdateInventoryInput,
    ): Promise<InventoryDto>;
  };
  deleteInventory: {
    execute(input: InventoryIdParamInput): Promise<void>;
  };
}

export type InventoryServiceResolver = (
  ctx: ExecutionContext,
) => InventoryApplicationServices;
