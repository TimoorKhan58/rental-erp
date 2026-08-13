import type { ExternalRentalApplicationServices } from "@/modules/external-rental/application/services/external-rental-application-services.interface";
import { AllocateExternalRentalService } from "@/modules/external-rental/application/services/allocate-external-rental.service";
import { CancelExternalRentalService } from "@/modules/external-rental/application/services/cancel-external-rental.service";
import { ConfirmExternalRentalService } from "@/modules/external-rental/application/services/confirm-external-rental.service";
import { CreateExternalRentalService } from "@/modules/external-rental/application/services/create-external-rental.service";
import { GetExternalRentalByIdService } from "@/modules/external-rental/application/services/get-external-rental-by-id.service";
import { ListExternalRentalsService } from "@/modules/external-rental/application/services/list-external-rentals.service";
import { ReceiveExternalRentalService } from "@/modules/external-rental/application/services/receive-external-rental.service";
import { SettleExternalRentalService } from "@/modules/external-rental/application/services/settle-external-rental.service";
import { SupplierReturnExternalRentalService } from "@/modules/external-rental/application/services/supplier-return-external-rental.service";
import { WriteOffExternalRentalService } from "@/modules/external-rental/application/services/write-off-external-rental.service";
import { createNumberSequenceRepositoryFromSharedDeps } from "@/modules/settings/infrastructure/factories/create-number-sequence.repository";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createExternalRentalRepositoryFromSharedDeps } from "./create-external-rental.repository";
import { createExternalRentalTransactionRunner } from "./create-external-rental-transaction.runner";

export type { ExternalRentalApplicationServices };

/**
 * Phase 25.5.3–25.5.6 + 25.10 + 27: list / get / create + workflow + cancel + write-off.
 */
export function createExternalRentalApplicationServices(
  deps: SharedDeps,
  userId?: string,
): ExternalRentalApplicationServices {
  const repository = createExternalRentalRepositoryFromSharedDeps(deps);
  const transactionRunner = createExternalRentalTransactionRunner(deps, {
    userId,
  });
  const numberSequences = createNumberSequenceRepositoryFromSharedDeps(deps);

  return {
    repository,
    getExternalRentalById: new GetExternalRentalByIdService(repository),
    listExternalRentals: new ListExternalRentalsService(repository),
    createExternalRental: new CreateExternalRentalService(
      transactionRunner,
      numberSequences,
      userId,
    ),
    confirmExternalRental: new ConfirmExternalRentalService(transactionRunner),
    receiveExternalRental: new ReceiveExternalRentalService(transactionRunner),
    allocateExternalRental: new AllocateExternalRentalService(
      transactionRunner,
    ),
    supplierReturnExternalRental: new SupplierReturnExternalRentalService(
      transactionRunner,
    ),
    writeOffExternalRental: new WriteOffExternalRentalService(transactionRunner),
    settleExternalRental: new SettleExternalRentalService(transactionRunner),
    cancelExternalRental: new CancelExternalRentalService(transactionRunner),
  };
}
