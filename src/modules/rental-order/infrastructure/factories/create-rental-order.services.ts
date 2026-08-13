import type { RentalOrderApplicationServices as RentalOrderApplicationServicesBase } from "@/modules/rental-order/application/services/rental-order-application-services.interface";
import { CancelRentalOrderService } from "@/modules/rental-order/application/services/cancel-rental-order.service";
import { ConfirmRentalOrderService } from "@/modules/rental-order/application/services/confirm-rental-order.service";
import { CreateRentalOrderService } from "@/modules/rental-order/application/services/create-rental-order.service";
import type { IRentalOrderService } from "@/modules/rental-order/application/services/rental-order-application-services.interface";
import { RentalOrderService } from "@/modules/rental-order/application/services/rental-order.service";
import { GetDateAwareAvailabilityService } from "@/modules/rental-order/application/services/get-date-aware-availability.service";
import { GetRentalOrderByIdService } from "@/modules/rental-order/application/services/get-rental-order-by-id.service";
import { GetRentalOrderShortfallService } from "@/modules/rental-order/application/services/get-rental-order-shortfall.service";
import { ListRentalOrdersService } from "@/modules/rental-order/application/services/list-rental-orders.service";
import { ReserveRentalOrderService } from "@/modules/rental-order/application/services/reserve-rental-order.service";
import { SourceRentalOrderExternallyService } from "@/modules/rental-order/application/services/source-rental-order-externally.service";
import { UpdateRentalOrderService } from "@/modules/rental-order/application/services/update-rental-order.service";
import { CreateExternalRentalService } from "@/modules/external-rental/application/services/create-external-rental.service";
import { createExternalRentalRepositoryFromSharedDeps } from "@/modules/external-rental/infrastructure/factories/create-external-rental.repository";
import { createExternalRentalTransactionRunner } from "@/modules/external-rental/infrastructure/factories/create-external-rental-transaction.runner";
import { createInventoryRepositoryFromSharedDeps } from "@/modules/inventory/infrastructure/factories/create-inventory.repository";
import { createSupplierRepositoryFromSharedDeps } from "@/modules/supplier/infrastructure/factories/create-supplier.repository";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { createNumberSequenceRepositoryFromSharedDeps } from "@/modules/settings/infrastructure/factories/create-number-sequence.repository";

import { createRentalOrderRepositoryFromSharedDeps } from "./create-rental-order.repository";
import { createRentalOrderTransactionRunner } from "./create-rental-order-transaction.runner";

export type { RentalOrderApplicationServicesBase as RentalOrderApplicationServices };

export interface WiredRentalOrderApplicationServices
  extends RentalOrderApplicationServicesBase {
  rentalOrderService: IRentalOrderService;
}

export function createRentalOrderApplicationServices(
  deps: SharedDeps,
  userId?: string,
): WiredRentalOrderApplicationServices {
  const repository = createRentalOrderRepositoryFromSharedDeps(deps);
  const inventoryRepository = createInventoryRepositoryFromSharedDeps(deps);
  const externalRentalRepository =
    createExternalRentalRepositoryFromSharedDeps(deps);
  const supplierRepository = createSupplierRepositoryFromSharedDeps(deps);
  const transactionRunner = createRentalOrderTransactionRunner(deps, {
    userId,
  });
  const numberSequences = createNumberSequenceRepositoryFromSharedDeps(deps);
  const externalRentalTransactionRunner = createExternalRentalTransactionRunner(
    deps,
    { userId },
  );
  const createExternalRental = new CreateExternalRentalService(
    externalRentalTransactionRunner,
    numberSequences,
    userId,
  );

  const getRentalOrderById = new GetRentalOrderByIdService(repository);
  const listRentalOrders = new ListRentalOrdersService(repository);
  const createRentalOrder = new CreateRentalOrderService(
    transactionRunner,
    numberSequences,
  );
  const updateRentalOrder = new UpdateRentalOrderService(transactionRunner);
  const confirmRentalOrder = new ConfirmRentalOrderService(transactionRunner);
  const reserveRentalOrder = new ReserveRentalOrderService(transactionRunner);
  const cancelRentalOrder = new CancelRentalOrderService(transactionRunner);
  const getDateAwareAvailability = new GetDateAwareAvailabilityService(
    repository,
    inventoryRepository,
  );
  const getRentalOrderShortfall = new GetRentalOrderShortfallService(
    repository,
    inventoryRepository,
    externalRentalRepository,
  );
  const sourceRentalOrderExternally = new SourceRentalOrderExternallyService(
    repository,
    inventoryRepository,
    externalRentalRepository,
    supplierRepository,
    createExternalRental,
  );

  return {
    getRentalOrderById,
    listRentalOrders,
    createRentalOrder,
    updateRentalOrder,
    confirmRentalOrder,
    reserveRentalOrder,
    cancelRentalOrder,
    getDateAwareAvailability,
    getRentalOrderShortfall,
    sourceRentalOrderExternally,
    rentalOrderService: new RentalOrderService(
      getRentalOrderById,
      listRentalOrders,
      createRentalOrder,
      updateRentalOrder,
      confirmRentalOrder,
      reserveRentalOrder,
      cancelRentalOrder,
    ),
  };
}
