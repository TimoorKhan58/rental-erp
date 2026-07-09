import type { PaginatedResult } from "@/shared/domain/pagination";

import type { PurchaseOrderDto } from "../dtos/purchase-order.dto";
import type {
  CreatePurchaseOrderInput,
  PurchaseOrderIdParamInput,
  ReceivePurchaseOrderInput,
  UpdatePurchaseOrderInput,
} from "../schemas/purchase-order.schemas";
import type { ListPurchaseOrdersInput } from "../schemas/list-purchase-orders.schema";
import type { IPurchaseOrderService } from "./purchase-order-application-services.interface";
import type { ApprovePurchaseOrderService } from "./approve-purchase-order.service";
import type { CancelPurchaseOrderService } from "./cancel-purchase-order.service";
import type { CreatePurchaseOrderService } from "./create-purchase-order.service";
import type { GetPurchaseOrderByIdService } from "./get-purchase-order-by-id.service";
import type { ListPurchaseOrdersService } from "./list-purchase-orders.service";
import type { ReceivePurchaseOrderService } from "./receive-purchase-order.service";
import type { UpdatePurchaseOrderService } from "./update-purchase-order.service";

export class PurchaseOrderService implements IPurchaseOrderService {
  constructor(
    private readonly getPurchaseOrderById: GetPurchaseOrderByIdService,
    private readonly listPurchaseOrders: ListPurchaseOrdersService,
    private readonly createPurchaseOrder: CreatePurchaseOrderService,
    private readonly updatePurchaseOrder: UpdatePurchaseOrderService,
    private readonly approvePurchaseOrder: ApprovePurchaseOrderService,
    private readonly receivePurchaseOrder: ReceivePurchaseOrderService,
    private readonly cancelPurchaseOrder: CancelPurchaseOrderService,
  ) {}

  getById(params: PurchaseOrderIdParamInput): Promise<PurchaseOrderDto> {
    return this.getPurchaseOrderById.execute(params);
  }

  list(input: ListPurchaseOrdersInput): Promise<PaginatedResult<PurchaseOrderDto>> {
    return this.listPurchaseOrders.execute(input);
  }

  create(input: CreatePurchaseOrderInput): Promise<PurchaseOrderDto> {
    return this.createPurchaseOrder.execute(input);
  }

  update(
    params: PurchaseOrderIdParamInput,
    input: UpdatePurchaseOrderInput,
  ): Promise<PurchaseOrderDto> {
    return this.updatePurchaseOrder.execute(params, input);
  }

  approve(params: PurchaseOrderIdParamInput): Promise<PurchaseOrderDto> {
    return this.approvePurchaseOrder.execute(params);
  }

  receive(
    params: PurchaseOrderIdParamInput,
    input: ReceivePurchaseOrderInput,
  ): Promise<PurchaseOrderDto> {
    return this.receivePurchaseOrder.execute(params, input);
  }

  cancel(params: PurchaseOrderIdParamInput): Promise<PurchaseOrderDto> {
    return this.cancelPurchaseOrder.execute(params);
  }
}
