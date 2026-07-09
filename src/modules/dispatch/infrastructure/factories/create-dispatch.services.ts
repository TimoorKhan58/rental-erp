import type { DispatchApplicationServices as DispatchApplicationServicesBase } from "@/modules/dispatch/application/services/dispatch-application-services.interface";
import { CancelDispatchService } from "@/modules/dispatch/application/services/cancel-dispatch.service";
import { CompleteDispatchService } from "@/modules/dispatch/application/services/complete-dispatch.service";
import { CreateDispatchService } from "@/modules/dispatch/application/services/create-dispatch.service";
import type { IDispatchService } from "@/modules/dispatch/application/services/dispatch-application-services.interface";
import { DispatchService } from "@/modules/dispatch/application/services/dispatch.service";
import { GetDispatchByIdService } from "@/modules/dispatch/application/services/get-dispatch-by-id.service";
import { ListDispatchesService } from "@/modules/dispatch/application/services/list-dispatches.service";
import { UpdateDispatchService } from "@/modules/dispatch/application/services/update-dispatch.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createDispatchRepositoryFromSharedDeps } from "./create-dispatch.repository";
import { createDispatchTransactionRunner } from "./create-dispatch-transaction.runner";

export type { DispatchApplicationServicesBase as DispatchApplicationServices };

export interface WiredDispatchApplicationServices
  extends DispatchApplicationServicesBase {
  dispatchService: IDispatchService;
}

export function createDispatchApplicationServices(
  deps: SharedDeps,
  userId?: string,
): WiredDispatchApplicationServices {
  const repository = createDispatchRepositoryFromSharedDeps(deps);
  const transactionRunner = createDispatchTransactionRunner(deps, { userId });

  const getDispatchById = new GetDispatchByIdService(repository);
  const listDispatches = new ListDispatchesService(repository);
  const createDispatch = new CreateDispatchService(transactionRunner);
  const updateDispatch = new UpdateDispatchService(transactionRunner);
  const completeDispatch = new CompleteDispatchService(transactionRunner);
  const cancelDispatch = new CancelDispatchService(transactionRunner);

  return {
    getDispatchById,
    listDispatches,
    createDispatch,
    updateDispatch,
    completeDispatch,
    cancelDispatch,
    dispatchService: new DispatchService(
      getDispatchById,
      listDispatches,
      createDispatch,
      updateDispatch,
      completeDispatch,
      cancelDispatch,
    ),
  };
}
