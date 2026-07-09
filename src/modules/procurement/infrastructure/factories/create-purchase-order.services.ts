import type { PurchaseOrderApplicationServices as PurchaseOrderApplicationServicesBase } from "@/modules/procurement/application/services/purchase-order-application-services.interface";
import { ApprovePurchaseOrderService } from "@/modules/procurement/application/services/approve-purchase-order.service";
import { CancelPurchaseOrderService } from "@/modules/procurement/application/services/cancel-purchase-order.service";
import { CreatePurchaseOrderService } from "@/modules/procurement/application/services/create-purchase-order.service";
import {
  PurchaseOrderService,
} from "@/modules/procurement/application/services/purchase-order.service";
import type { IPurchaseOrderService } from "@/modules/procurement/application/services/purchase-order-application-services.interface";
import { GetPurchaseOrderByIdService } from "@/modules/procurement/application/services/get-purchase-order-by-id.service";
import { ListPurchaseOrdersService } from "@/modules/procurement/application/services/list-purchase-orders.service";
import { ReceivePurchaseOrderService } from "@/modules/procurement/application/services/receive-purchase-order.service";
import { UpdatePurchaseOrderService } from "@/modules/procurement/application/services/update-purchase-order.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createPurchaseOrderRepositoryFromSharedDeps } from "./create-purchase-order.repository";
import { createPurchaseOrderTransactionRunner } from "./create-purchase-order-transaction.runner";

export type { PurchaseOrderApplicationServicesBase as PurchaseOrderApplicationServices };

export interface WiredPurchaseOrderApplicationServices
  extends PurchaseOrderApplicationServicesBase {
  purchaseOrderService: IPurchaseOrderService;
}

export function createPurchaseOrderApplicationServices(
  deps: SharedDeps,
  userId?: string,
): WiredPurchaseOrderApplicationServices {
  const repository = createPurchaseOrderRepositoryFromSharedDeps(deps);
  const transactionRunner = createPurchaseOrderTransactionRunner(deps, {
    userId,
  });

  const getPurchaseOrderById = new GetPurchaseOrderByIdService(repository);
  const listPurchaseOrders = new ListPurchaseOrdersService(repository);
  const createPurchaseOrder = new CreatePurchaseOrderService(transactionRunner);
  const updatePurchaseOrder = new UpdatePurchaseOrderService(transactionRunner);
  const approvePurchaseOrder = new ApprovePurchaseOrderService(transactionRunner);
  const receivePurchaseOrder = new ReceivePurchaseOrderService(transactionRunner);
  const cancelPurchaseOrder = new CancelPurchaseOrderService(transactionRunner);

  return {
    getPurchaseOrderById,
    listPurchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrder,
    approvePurchaseOrder,
    receivePurchaseOrder,
    cancelPurchaseOrder,
    purchaseOrderService: new PurchaseOrderService(
      getPurchaseOrderById,
      listPurchaseOrders,
      createPurchaseOrder,
      updatePurchaseOrder,
      approvePurchaseOrder,
      receivePurchaseOrder,
      cancelPurchaseOrder,
    ),
  };
}
