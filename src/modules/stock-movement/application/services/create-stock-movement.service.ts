import { parseRequest } from "@/shared/application/validation";

import type { StockMovementDto } from "../dtos/stock-movement.dto";
import { toStockMovementDto } from "../mappers/stock-movement.mapper";
import {
  CreateStockMovementSchema,
  type CreateStockMovementInput,
} from "../schemas/stock-movement.schemas";
import { executeCreateStockMovementInScope } from "./create-stock-movement-in-scope";
import type { IStockMovementTransactionRunner } from "./stock-movement-transaction.runner";

export class CreateStockMovementService {
  constructor(
    private readonly transactionRunner: IStockMovementTransactionRunner,
  ) {}

  async execute(input: CreateStockMovementInput): Promise<StockMovementDto> {
    const data = parseRequest(CreateStockMovementSchema, input);

    return this.transactionRunner.run(async (scope) => {
      const movement = await executeCreateStockMovementInScope(scope, data);
      return toStockMovementDto(movement);
    });
  }
}
