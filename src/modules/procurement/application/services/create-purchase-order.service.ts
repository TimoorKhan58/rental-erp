import { PurchaseOrder } from "@/modules/procurement/domain/purchase-order.entity";
import {
  PurchaseOrderInvariantError,
} from "@/modules/procurement/domain/purchase-order.errors";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { PurchaseOrderDto } from "../dtos/purchase-order.dto";
import {
  toCreatePurchaseOrderData,
  toPurchaseOrderDto,
} from "../mappers/purchase-order.mapper";
import {
  CreatePurchaseOrderSchema,
  type CreatePurchaseOrderInput,
} from "../schemas/purchase-order.schemas";
import { toPurchaseOrderAuditValues } from "./purchase-order-audit.mapper";
import {
  PURCHASE_ORDER_ENTITY_NAME,
  PURCHASE_ORDER_MODULE,
} from "./purchase-order-service.constants";
import type { IPurchaseOrderTransactionRunner } from "./purchase-order-transaction.runner";

export class CreatePurchaseOrderService {
  constructor(
    private readonly transactionRunner: IPurchaseOrderTransactionRunner,
  ) {}

  async execute(input: CreatePurchaseOrderInput): Promise<PurchaseOrderDto> {
    const data = parseRequest(CreatePurchaseOrderSchema, input);
    const createData = toCreatePurchaseOrderData(data);

    try {
      PurchaseOrder.create(createData);
    } catch (error) {
      if (error instanceof PurchaseOrderInvariantError) {
        throw new UnprocessableError({
          message: error.message,
          details: { field: error.field },
        });
      }

      throw error;
    }

    return this.transactionRunner.run(async ({ purchaseOrderRepository, auditLogger }) => {
      const existing = await purchaseOrderRepository.findByPoNumber(
        createData.poNumber,
      );

      if (existing !== null) {
        throw new ConflictError({
          message: "PO number already exists",
          details: { poNumber: createData.poNumber },
        });
      }

      const order = await purchaseOrderRepository.create(createData);

      await auditLogger.log({
        module: PURCHASE_ORDER_MODULE,
        entityName: PURCHASE_ORDER_ENTITY_NAME,
        recordId: order.id,
        action: "CREATE",
        status: "SUCCESS",
        newValues: toPurchaseOrderAuditValues(order),
      });

      return toPurchaseOrderDto(order);
    });
  }
}
