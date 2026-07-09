import type { ExecutionContext } from "@/shared/application/context";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { StockMovementDto } from "../dtos/stock-movement.dto";
import type {
  CreateStockMovementInput,
  StockMovementIdParamInput,
} from "../schemas/stock-movement.schemas";
import type { ListStockMovementsInput } from "../schemas/list-stock-movement.schema";

export interface StockMovementApplicationServices {
  getStockMovementById: {
    execute(input: StockMovementIdParamInput): Promise<StockMovementDto>;
  };
  listStockMovements: {
    execute(
      input: ListStockMovementsInput,
    ): Promise<PaginatedResult<StockMovementDto>>;
  };
  createStockMovement: {
    execute(input: CreateStockMovementInput): Promise<StockMovementDto>;
  };
}

export type StockMovementServiceResolver = (
  ctx: ExecutionContext,
) => StockMovementApplicationServices;
