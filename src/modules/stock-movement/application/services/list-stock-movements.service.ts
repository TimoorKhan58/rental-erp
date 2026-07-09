import type { IStockMovementRepository } from "@/modules/stock-movement/domain/stock-movement.repository.interface";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { StockMovementDto } from "../dtos/stock-movement.dto";
import { toStockMovementListQuery } from "../mappers/stock-movement-list.mapper";
import { toStockMovementDto } from "../mappers/stock-movement.mapper";
import {
  ListStockMovementsSchema,
  type ListStockMovementsInput,
} from "../schemas/list-stock-movement.schema";

export class ListStockMovementsService {
  constructor(
    private readonly repository: IStockMovementRepository,
  ) {}

  async execute(
    input: ListStockMovementsInput,
  ): Promise<PaginatedResult<StockMovementDto>> {
    const query = parseRequest(ListStockMovementsSchema, input);
    const result = await this.repository.findPaged(
      toStockMovementListQuery(query),
    );

    return {
      items: result.items.map(toStockMovementDto),
      meta: result.meta,
    };
  }
}
