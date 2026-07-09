import type { IStockMovementRepository } from "@/modules/stock-movement/domain/stock-movement.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { StockMovementDto } from "../dtos/stock-movement.dto";
import {
  toStockMovementDto,
  toStockMovementId,
} from "../mappers/stock-movement.mapper";
import {
  StockMovementIdParamSchema,
  type StockMovementIdParamInput,
} from "../schemas/stock-movement.schemas";

export class GetStockMovementByIdService {
  constructor(
    private readonly repository: IStockMovementRepository,
  ) {}

  async execute(input: StockMovementIdParamInput): Promise<StockMovementDto> {
    const params = parseRequest(StockMovementIdParamSchema, input);
    const movement = await this.repository.findById(
      toStockMovementId(params.id),
    );

    if (movement === null) {
      throw new NotFoundError({
        message: "Stock movement not found",
        details: { id: params.id },
      });
    }

    return toStockMovementDto(movement);
  }
}
