import type { PaginatedResult } from "@/shared/domain/pagination";

import type { PurchaseOrderDto } from "../dtos/purchase-order.dto";
import type {
  CreatePurchaseOrderInput,
  PurchaseOrderIdParamInput,
  ReceivePurchaseOrderInput,
  UpdatePurchaseOrderInput,
} from "../schemas/purchase-order.schemas";
import type { ListPurchaseOrdersInput } from "../schemas/list-purchase-orders.schema";
import type { ApprovePurchaseOrderService } from "./approve-purchase-order.service";
import type { CancelPurchaseOrderService } from "./cancel-purchase-order.service";
import type { CreatePurchaseOrderService } from "./create-purchase-order.service";
import type { GetPurchaseOrderByIdService } from "./get-purchase-order-by-id.service";
import type { ListPurchaseOrdersService } from "./list-purchase-orders.service";
import type { ReceivePurchaseOrderService } from "./receive-purchase-order.service";
import type { UpdatePurchaseOrderService } from "./update-purchase-order.service";

export interface PurchaseOrderApplicationServices {
  getPurchaseOrderById: GetPurchaseOrderByIdService;
  listPurchaseOrders: ListPurchaseOrdersService;
  createPurchaseOrder: CreatePurchaseOrderService;
  updatePurchaseOrder: UpdatePurchaseOrderService;
  approvePurchaseOrder: ApprovePurchaseOrderService;
  receivePurchaseOrder: ReceivePurchaseOrderService;
  cancelPurchaseOrder: CancelPurchaseOrderService;
}

export type PurchaseOrderServiceResolver = (
  ctx: import("@/shared/application/context").ExecutionContext,
) => PurchaseOrderApplicationServices;

export interface IPurchaseOrderService {
  getById(params: PurchaseOrderIdParamInput): Promise<PurchaseOrderDto>;
  list(input: ListPurchaseOrdersInput): Promise<PaginatedResult<PurchaseOrderDto>>;
  create(input: CreatePurchaseOrderInput): Promise<PurchaseOrderDto>;
  update(
    params: PurchaseOrderIdParamInput,
    input: UpdatePurchaseOrderInput,
  ): Promise<PurchaseOrderDto>;
  approve(params: PurchaseOrderIdParamInput): Promise<PurchaseOrderDto>;
  receive(
    params: PurchaseOrderIdParamInput,
    input: ReceivePurchaseOrderInput,
  ): Promise<PurchaseOrderDto>;
  cancel(params: PurchaseOrderIdParamInput): Promise<PurchaseOrderDto>;
}
