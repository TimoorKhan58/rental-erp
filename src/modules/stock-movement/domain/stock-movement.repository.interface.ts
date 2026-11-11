import type { StockMovementId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { StockMovement } from "./stock-movement.entity";
import type { StockMovementListQuery } from "./stock-movement-list.query";
import type { CreateStockMovementData } from "./stock-movement.types";

export interface IStockMovementRepository {
  findById(id: StockMovementId): Promise<StockMovement | null>;
  findPaged(
    query: StockMovementListQuery,
  ): Promise<PaginatedResult<StockMovement>>;
  create(data: CreateStockMovementData): Promise<StockMovement>;
  /** Total RELEASE quantity recorded for one reference on one inventory row. */
  sumReleased(
    inventoryId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<number>;
}
