import type { RepairApplicationServices as RepairApplicationServicesBase } from "@/modules/repair/application/services/repair-application-services.interface";
import { CancelRepairService } from "@/modules/repair/application/services/cancel-repair.service";
import { CompleteRepairService } from "@/modules/repair/application/services/complete-repair.service";
import { CreateRepairService } from "@/modules/repair/application/services/create-repair.service";
import type { IRepairService } from "@/modules/repair/application/services/repair-application-services.interface";
import { GetRepairByIdService } from "@/modules/repair/application/services/get-repair-by-id.service";
import { ListRepairsService } from "@/modules/repair/application/services/list-repairs.service";
import { RepairService } from "@/modules/repair/application/services/repair.service";
import { StartRepairService } from "@/modules/repair/application/services/start-repair.service";
import { UpdateRepairService } from "@/modules/repair/application/services/update-repair.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createRepairRepositoryFromSharedDeps } from "./create-repair.repository";
import { createRepairTransactionRunner } from "./create-repair-transaction.runner";

export type { RepairApplicationServicesBase as RepairApplicationServices };

export interface WiredRepairApplicationServices
  extends RepairApplicationServicesBase {
  repairService: IRepairService;
}

export function createRepairApplicationServices(
  deps: SharedDeps,
  userId?: string,
): WiredRepairApplicationServices {
  const repository = createRepairRepositoryFromSharedDeps(deps);
  const transactionRunner = createRepairTransactionRunner(deps, { userId });

  const getRepairById = new GetRepairByIdService(repository);
  const listRepairs = new ListRepairsService(repository);
  const createRepair = new CreateRepairService(transactionRunner);
  const updateRepair = new UpdateRepairService(transactionRunner);
  const startRepair = new StartRepairService(transactionRunner);
  const completeRepair = new CompleteRepairService(transactionRunner);
  const cancelRepair = new CancelRepairService(transactionRunner);

  return {
    getRepairById,
    listRepairs,
    createRepair,
    updateRepair,
    startRepair,
    completeRepair,
    cancelRepair,
    repairService: new RepairService(
      getRepairById,
      listRepairs,
      createRepair,
      updateRepair,
      startRepair,
      completeRepair,
      cancelRepair,
    ),
  };
}
