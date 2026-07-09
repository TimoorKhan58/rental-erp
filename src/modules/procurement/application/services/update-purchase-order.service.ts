import {
  PurchaseOrderInvalidStatusError,
  PurchaseOrderInvariantError,
} from "@/modules/procurement/domain/purchase-order.errors";
import { validatePurchaseOrderItems } from "@/modules/procurement/domain/purchase-order.rules";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { PurchaseOrderDto } from "../dtos/purchase-order.dto";
import {
  toPurchaseOrderDto,
  toPurchaseOrderId,
  toUpdatePurchaseOrderData,
} from "../mappers/purchase-order.mapper";
import {
  PurchaseOrderIdParamSchema,
  UpdatePurchaseOrderSchema,
  type PurchaseOrderIdParamInput,
  type UpdatePurchaseOrderInput,
} from "../schemas/purchase-order.schemas";
import { toPurchaseOrderAuditValues } from "./purchase-order-audit.mapper";
import {
  PURCHASE_ORDER_ENTITY_NAME,
  PURCHASE_ORDER_MODULE,
} from "./purchase-order-service.constants";
import type { IPurchaseOrderTransactionRunner } from "./purchase-order-transaction.runner";

export class UpdatePurchaseOrderService {
  constructor(
    private readonly transactionRunner: IPurchaseOrderTransactionRunner,
  ) {}

  async execute(
    params: PurchaseOrderIdParamInput,
    input: UpdatePurchaseOrderInput,
  ): Promise<PurchaseOrderDto> {
    const { id } = parseRequest(PurchaseOrderIdParamSchema, params);
    const data = parseRequest(UpdatePurchaseOrderSchema, input);
    const updateData = toUpdatePurchaseOrderData(data);

    if (updateData.items !== undefined) {
      try {
        validatePurchaseOrderItems(updateData.items);
      } catch (error) {
        if (error instanceof PurchaseOrderInvariantError) {
          throw new UnprocessableError({
            message: error.message,
            details: { field: error.field },
          });
        }

        throw error;
      }
    }

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

      try {
        existing.assertCanUpdate();
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
      const updated = await purchaseOrderRepository.update(
        existing.id,
        updateData,
      );

      await auditLogger.log({
        module: PURCHASE_ORDER_MODULE,
        entityName: PURCHASE_ORDER_ENTITY_NAME,
        recordId: updated.id,
        action: "UPDATE",
        status: "SUCCESS",
        oldValues: previousValues,
        newValues: toPurchaseOrderAuditValues(updated),
      });

      return toPurchaseOrderDto(updated);
    });
  }
}
