import type { ReturnApplicationServices as ReturnApplicationServicesBase } from "@/modules/return/application/services/return-application-services.interface";
import { CancelReturnService } from "@/modules/return/application/services/cancel-return.service";
import { CompleteReturnService } from "@/modules/return/application/services/complete-return.service";
import { CreateReturnService } from "@/modules/return/application/services/create-return.service";
import type { IReturnService } from "@/modules/return/application/services/return-application-services.interface";
import { GetReturnByIdService } from "@/modules/return/application/services/get-return-by-id.service";
import { InspectReturnService } from "@/modules/return/application/services/inspect-return.service";
import { ListReturnsService } from "@/modules/return/application/services/list-returns.service";
import { ReceiveReturnService } from "@/modules/return/application/services/receive-return.service";
import { ReturnService } from "@/modules/return/application/services/return.service";
import { UpdateReturnService } from "@/modules/return/application/services/update-return.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createReturnRepositoryFromSharedDeps } from "./create-return.repository";
import { createReturnTransactionRunner } from "./create-return-transaction.runner";

export type { ReturnApplicationServicesBase as ReturnApplicationServices };

export interface WiredReturnApplicationServices
  extends ReturnApplicationServicesBase {
  returnService: IReturnService;
}

export function createReturnApplicationServices(
  deps: SharedDeps,
  userId?: string,
): WiredReturnApplicationServices {
  const repository = createReturnRepositoryFromSharedDeps(deps);
  const transactionRunner = createReturnTransactionRunner(deps, { userId });

  const getReturnById = new GetReturnByIdService(repository);
  const listReturns = new ListReturnsService(repository);
  const createReturn = new CreateReturnService(transactionRunner);
  const updateReturn = new UpdateReturnService(transactionRunner);
  const receiveReturn = new ReceiveReturnService(transactionRunner);
  const inspectReturn = new InspectReturnService(transactionRunner);
  const completeReturn = new CompleteReturnService(transactionRunner);
  const cancelReturn = new CancelReturnService(transactionRunner);

  return {
    getReturnById,
    listReturns,
    createReturn,
    updateReturn,
    receiveReturn,
    inspectReturn,
    completeReturn,
    cancelReturn,
    returnService: new ReturnService(
      getReturnById,
      listReturns,
      createReturn,
      updateReturn,
      receiveReturn,
      inspectReturn,
      completeReturn,
      cancelReturn,
    ),
  };
}
