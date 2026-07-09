import type { InventoryApplicationServices as InventoryApplicationServicesBase } from "@/modules/inventory/application/services/inventory-application-services.interface";
import { CreateInventoryService } from "@/modules/inventory/application/services/create-inventory.service";
import {
  InventoryService,
  type IInventoryService,
} from "@/modules/inventory/application/services/inventory.service";
import { DeleteInventoryService } from "@/modules/inventory/application/services/delete-inventory.service";
import { GetInventoryByIdService } from "@/modules/inventory/application/services/get-inventory-by-id.service";
import { ListInventoryService } from "@/modules/inventory/application/services/list-inventory.service";
import { UpdateInventoryService } from "@/modules/inventory/application/services/update-inventory.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createInventoryRepositoryFromSharedDeps } from "./create-inventory.repository";
import { createInventoryTransactionRunner } from "./create-inventory-transaction.runner";

export type { InventoryApplicationServicesBase as InventoryApplicationServices };

export interface WiredInventoryApplicationServices
  extends InventoryApplicationServicesBase {
  inventoryService: IInventoryService;
}

export function createInventoryApplicationServices(
  deps: SharedDeps,
): WiredInventoryApplicationServices {
  const repository = createInventoryRepositoryFromSharedDeps(deps);
  const transactionRunner = createInventoryTransactionRunner(deps);

  const getInventoryById = new GetInventoryByIdService(repository);
  const listInventory = new ListInventoryService(repository);
  const createInventory = new CreateInventoryService(transactionRunner);
  const updateInventory = new UpdateInventoryService(transactionRunner);
  const deleteInventory = new DeleteInventoryService(transactionRunner);

  return {
    getInventoryById,
    listInventory,
    createInventory,
    updateInventory,
    deleteInventory,
    inventoryService: new InventoryService(
      getInventoryById,
      listInventory,
      createInventory,
      updateInventory,
      deleteInventory,
    ),
  };
}
