import type { PaginatedResult } from "@/shared/domain/pagination";

import type { StockMovementDto } from "../dtos/stock-movement.dto";
import type {
  CreateStockMovementInput,
  StockMovementIdParamInput,
} from "../schemas/stock-movement.schemas";
import type { ListStockMovementsInput } from "../schemas/list-stock-movement.schema";
import { CreateStockMovementService } from "./create-stock-movement.service";
import { GetStockMovementByIdService } from "./get-stock-movement-by-id.service";
import { ListStockMovementsService } from "./list-stock-movements.service";

export interface IStockMovementService {
  getById(input: StockMovementIdParamInput): Promise<StockMovementDto>;
  list(input: ListStockMovementsInput): Promise<PaginatedResult<StockMovementDto>>;
  create(input: CreateStockMovementInput): Promise<StockMovementDto>;
}

export class StockMovementService implements IStockMovementService {
  constructor(
    private readonly getStockMovementByIdService: GetStockMovementByIdService,
    private readonly listStockMovementsService: ListStockMovementsService,
    private readonly createStockMovementService: CreateStockMovementService,
  ) {}

  getById(input: StockMovementIdParamInput): Promise<StockMovementDto> {
    return this.getStockMovementByIdService.execute(input);
  }

  list(
    input: ListStockMovementsInput,
  ): Promise<PaginatedResult<StockMovementDto>> {
    return this.listStockMovementsService.execute(input);
  }

  create(input: CreateStockMovementInput): Promise<StockMovementDto> {
    return this.createStockMovementService.execute(input);
  }
}
