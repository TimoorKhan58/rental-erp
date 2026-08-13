import type { IExternalRentalRepository } from "@/modules/external-rental/domain";
import type { ExecutionContext } from "@/shared/application/context";

import type { AllocateExternalRentalService } from "./allocate-external-rental.service";
import type { CancelExternalRentalService } from "./cancel-external-rental.service";
import type { ConfirmExternalRentalService } from "./confirm-external-rental.service";
import type { CreateExternalRentalService } from "./create-external-rental.service";
import type { GetExternalRentalByIdService } from "./get-external-rental-by-id.service";
import type { ListExternalRentalsService } from "./list-external-rentals.service";
import type { ReceiveExternalRentalService } from "./receive-external-rental.service";
import type { SettleExternalRentalService } from "./settle-external-rental.service";
import type { SupplierReturnExternalRentalService } from "./supplier-return-external-rental.service";
import type { WriteOffExternalRentalService } from "./write-off-external-rental.service";

/**
 * Application service surface for Phase 25.5.3–25.5.6 + 25.10 cancel + 27 write-off.
 */
export interface ExternalRentalApplicationServices {
  readonly repository: IExternalRentalRepository;
  readonly getExternalRentalById: GetExternalRentalByIdService;
  readonly listExternalRentals: ListExternalRentalsService;
  readonly createExternalRental: CreateExternalRentalService;
  readonly confirmExternalRental: ConfirmExternalRentalService;
  readonly receiveExternalRental: ReceiveExternalRentalService;
  readonly allocateExternalRental: AllocateExternalRentalService;
  readonly supplierReturnExternalRental: SupplierReturnExternalRentalService;
  readonly writeOffExternalRental: WriteOffExternalRentalService;
  readonly settleExternalRental: SettleExternalRentalService;
  readonly cancelExternalRental: CancelExternalRentalService;
}

export type ExternalRentalServiceResolver = (
  ctx: ExecutionContext,
) => ExternalRentalApplicationServices;
