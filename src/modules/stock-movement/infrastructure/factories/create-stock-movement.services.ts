import type { StockMovementApplicationServices as StockMovementApplicationServicesBase } from "@/modules/stock-movement/application/services/stock-movement-application-services.interface";
import { CreateStockMovementService } from "@/modules/stock-movement/application/services/create-stock-movement.service";
import {
  StockMovementService,
  type IStockMovementService,
} from "@/modules/stock-movement/application/services/stock-movement.service";
import { GetStockMovementByIdService } from "@/modules/stock-movement/application/services/get-stock-movement-by-id.service";
import { ListStockMovementsService } from "@/modules/stock-movement/application/services/list-stock-movements.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createStockMovementRepositoryFromSharedDeps } from "./create-stock-movement.repository";
import { createStockMovementTransactionRunner } from "./create-stock-movement-transaction.runner";

export type { StockMovementApplicationServicesBase as StockMovementApplicationServices };

export interface WiredStockMovementApplicationServices
  extends StockMovementApplicationServicesBase {
  stockMovementService: IStockMovementService;
}

export function createStockMovementApplicationServices(
  deps: SharedDeps,
  userId?: string,
): WiredStockMovementApplicationServices {
  const repository = createStockMovementRepositoryFromSharedDeps(deps);
  const transactionRunner = createStockMovementTransactionRunner(deps, {
    userId,
  });

  const getStockMovementById = new GetStockMovementByIdService(repository);
  const listStockMovements = new ListStockMovementsService(repository);
  const createStockMovement = new CreateStockMovementService(transactionRunner);

  return {
    getStockMovementById,
    listStockMovements,
    createStockMovement,
    stockMovementService: new StockMovementService(
      getStockMovementById,
      listStockMovements,
      createStockMovement,
    ),
  };
}
