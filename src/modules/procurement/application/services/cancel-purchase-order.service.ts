import {
  PurchaseOrderInvalidStatusError,
} from "@/modules/procurement/domain/purchase-order.errors";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { PurchaseOrderDto } from "../dtos/purchase-order.dto";
import {
  toPurchaseOrderDto,
  toPurchaseOrderId,
} from "../mappers/purchase-order.mapper";
import {
  PurchaseOrderIdParamSchema,
  type PurchaseOrderIdParamInput,
} from "../schemas/purchase-order.schemas";
import { toPurchaseOrderAuditValues } from "./purchase-order-audit.mapper";
import {
  PURCHASE_ORDER_ENTITY_NAME,
  PURCHASE_ORDER_MODULE,
} from "./purchase-order-service.constants";
import type { IPurchaseOrderTransactionRunner } from "./purchase-order-transaction.runner";

export class CancelPurchaseOrderService {
  constructor(
    private readonly transactionRunner: IPurchaseOrderTransactionRunner,
  ) {}

  async execute(params: PurchaseOrderIdParamInput): Promise<PurchaseOrderDto> {
    const { id } = parseRequest(PurchaseOrderIdParamSchema, params);

    return this.transactionRunner.run(async ({ purchaseOrderRepository, auditLogger }) => {
      const existing = await purchaseOrderRepository.findById(
        toPurchaseOrderId(id),
      );

      if (existing === null) {
        throw new NotFoundError({
          message: "Purchase order not found",
          details: { id },
        });
      }

      let cancelled;

      try {
        cancelled = existing.withCancelled();
      } catch (error) {
        if (error instanceof PurchaseOrderInvalidStatusError) {
          throw new UnprocessableError({
            message: error.message,
            details: {
              currentStatus: error.currentStatus,
              action: error.action,
            },
          });
        }

        throw error;
      }

      const previousValues = toPurchaseOrderAuditValues(existing);
      const updated = await purchaseOrderRepository.updateStatus(
        existing.id,
        cancelled.status,
      );

      await auditLogger.log({
        module: PURCHASE_ORDER_MODULE,
        entityName: PURCHASE_ORDER_ENTITY_NAME,
        recordId: updated.id,
        action: "CANCEL",
        status: "SUCCESS",
        oldValues: previousValues,
        newValues: toPurchaseOrderAuditValues(updated),
      });

      return toPurchaseOrderDto(updated);
    });
  }
}
