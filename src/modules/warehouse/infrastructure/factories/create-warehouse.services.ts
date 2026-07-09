import type { WarehouseApplicationServices as WarehouseApplicationServicesBase } from "@/modules/warehouse/application/services/warehouse-application-services.interface";
import { CreateWarehouseService } from "@/modules/warehouse/application/services/create-warehouse.service";
import {
  WarehouseService,
  type IWarehouseService,
} from "@/modules/warehouse/application/services/warehouse.service";
import { DeleteWarehouseService } from "@/modules/warehouse/application/services/delete-warehouse.service";
import { GetWarehouseByIdService } from "@/modules/warehouse/application/services/get-warehouse-by-id.service";
import { ListWarehousesService } from "@/modules/warehouse/application/services/list-warehouses.service";
import { UpdateWarehouseService } from "@/modules/warehouse/application/services/update-warehouse.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createWarehouseRepositoryFromSharedDeps } from "./create-warehouse.repository";
import { createWarehouseTransactionRunner } from "./create-warehouse-transaction.runner";

export type { WarehouseApplicationServicesBase as WarehouseApplicationServices };

export interface WiredWarehouseApplicationServices
  extends WarehouseApplicationServicesBase {
  warehouseService: IWarehouseService;
}

export function createWarehouseApplicationServices(
  deps: SharedDeps,
): WiredWarehouseApplicationServices {
  const repository = createWarehouseRepositoryFromSharedDeps(deps);
  const transactionRunner = createWarehouseTransactionRunner(deps);

  const getWarehouseById = new GetWarehouseByIdService(repository);
  const listWarehouses = new ListWarehousesService(repository);
  const createWarehouse = new CreateWarehouseService(transactionRunner);
  const updateWarehouse = new UpdateWarehouseService(transactionRunner);
  const deleteWarehouse = new DeleteWarehouseService(transactionRunner);

  return {
    getWarehouseById,
    listWarehouses,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    warehouseService: new WarehouseService(
      getWarehouseById,
      listWarehouses,
      createWarehouse,
      updateWarehouse,
      deleteWarehouse,
    ),
  };
}
