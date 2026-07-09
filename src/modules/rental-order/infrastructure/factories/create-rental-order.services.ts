import type { RentalOrderApplicationServices as RentalOrderApplicationServicesBase } from "@/modules/rental-order/application/services/rental-order-application-services.interface";
import { CancelRentalOrderService } from "@/modules/rental-order/application/services/cancel-rental-order.service";
import { ConfirmRentalOrderService } from "@/modules/rental-order/application/services/confirm-rental-order.service";
import { CreateRentalOrderService } from "@/modules/rental-order/application/services/create-rental-order.service";
import type { IRentalOrderService } from "@/modules/rental-order/application/services/rental-order-application-services.interface";
import { RentalOrderService } from "@/modules/rental-order/application/services/rental-order.service";
import { GetRentalOrderByIdService } from "@/modules/rental-order/application/services/get-rental-order-by-id.service";
import { ListRentalOrdersService } from "@/modules/rental-order/application/services/list-rental-orders.service";
import { ReserveRentalOrderService } from "@/modules/rental-order/application/services/reserve-rental-order.service";
import { UpdateRentalOrderService } from "@/modules/rental-order/application/services/update-rental-order.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

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
  const transactionRunner = createRentalOrderTransactionRunner(deps, {
    userId,
  });

  const getRentalOrderById = new GetRentalOrderByIdService(repository);
  const listRentalOrders = new ListRentalOrdersService(repository);
  const createRentalOrder = new CreateRentalOrderService(transactionRunner);
  const updateRentalOrder = new UpdateRentalOrderService(transactionRunner);
  const confirmRentalOrder = new ConfirmRentalOrderService(transactionRunner);
  const reserveRentalOrder = new ReserveRentalOrderService(transactionRunner);
  const cancelRentalOrder = new CancelRentalOrderService(transactionRunner);

  return {
    getRentalOrderById,
    listRentalOrders,
    createRentalOrder,
    updateRentalOrder,
    confirmRentalOrder,
    reserveRentalOrder,
    cancelRentalOrder,
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
