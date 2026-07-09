import type { MaintenanceApplicationServices as MaintenanceApplicationServicesBase } from "@/modules/maintenance/application/services/maintenance-application-services.interface";
import { CancelMaintenanceService } from "@/modules/maintenance/application/services/cancel-maintenance.service";
import { CompleteMaintenanceService } from "@/modules/maintenance/application/services/complete-maintenance.service";
import { CreateMaintenanceService } from "@/modules/maintenance/application/services/create-maintenance.service";
import type { IMaintenanceService } from "@/modules/maintenance/application/services/maintenance-application-services.interface";
import { GetMaintenanceByIdService } from "@/modules/maintenance/application/services/get-maintenance-by-id.service";
import { ListMaintenancesService } from "@/modules/maintenance/application/services/list-maintenances.service";
import { MaintenanceService } from "@/modules/maintenance/application/services/maintenance.service";
import { StartMaintenanceService } from "@/modules/maintenance/application/services/start-maintenance.service";
import { UpdateMaintenanceService } from "@/modules/maintenance/application/services/update-maintenance.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createMaintenanceRepositoryFromSharedDeps } from "./create-maintenance.repository";
import { createMaintenanceTransactionRunner } from "./create-maintenance-transaction.runner";

export type { MaintenanceApplicationServicesBase as MaintenanceApplicationServices };

export interface WiredMaintenanceApplicationServices
  extends MaintenanceApplicationServicesBase {
  maintenanceService: IMaintenanceService;
}

export function createMaintenanceApplicationServices(
  deps: SharedDeps,
  userId?: string,
): WiredMaintenanceApplicationServices {
  const repository = createMaintenanceRepositoryFromSharedDeps(deps);
  const transactionRunner = createMaintenanceTransactionRunner(deps, { userId });

  const getMaintenanceById = new GetMaintenanceByIdService(repository);
  const listMaintenances = new ListMaintenancesService(repository);
  const createMaintenance = new CreateMaintenanceService(transactionRunner);
  const updateMaintenance = new UpdateMaintenanceService(transactionRunner);
  const startMaintenance = new StartMaintenanceService(transactionRunner);
  const completeMaintenance = new CompleteMaintenanceService(transactionRunner);
  const cancelMaintenance = new CancelMaintenanceService(transactionRunner);

  return {
    getMaintenanceById,
    listMaintenances,
    createMaintenance,
    updateMaintenance,
    startMaintenance,
    completeMaintenance,
    cancelMaintenance,
    maintenanceService: new MaintenanceService(
      getMaintenanceById,
      listMaintenances,
      createMaintenance,
      updateMaintenance,
      startMaintenance,
      completeMaintenance,
      cancelMaintenance,
    ),
  };
}
