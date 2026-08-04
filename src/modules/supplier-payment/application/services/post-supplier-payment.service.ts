import { toPurchaseOrderAuditValues } from "@/modules/procurement/application/services/purchase-order-audit.mapper";
import {
  PURCHASE_ORDER_ENTITY_NAME,
  PURCHASE_ORDER_MODULE,
} from "@/modules/procurement/domain/purchase-order.constants";
import { SupplierPaymentInvalidStatusError } from "@/modules/supplier-payment/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { SupplierPaymentDto } from "../dtos/supplier-payment.dto";
import {
  toPurchaseOrderId,
  toSupplierPaymentDto,
  toSupplierPaymentId,
} from "../mappers/supplier-payment.mapper";
import {
  SupplierPaymentIdParamSchema,
  type SupplierPaymentIdParamInput,
} from "../schemas/supplier-payment.schemas";
import { toSupplierPaymentAuditValues } from "./supplier-payment-audit.mapper";
import {
  applyPaymentToPurchaseOrder,
  validatePurchaseOrderForSupplierPayment,
} from "./supplier-payment-purchase-order.validation";
import {
  SUPPLIER_PAYMENT_ENTITY_NAME,
  SUPPLIER_PAYMENT_MODULE,
} from "./supplier-payment-service.constants";
import type { ISupplierPaymentTransactionRunner } from "./supplier-payment-transaction.runner";

export class PostSupplierPaymentService {
  constructor(
    private readonly transactionRunner: ISupplierPaymentTransactionRunner,
  ) {}

  async execute(
    params: SupplierPaymentIdParamInput,
  ): Promise<SupplierPaymentDto> {
    const { id } = parseRequest(SupplierPaymentIdParamSchema, params);

    return this.transactionRunner.run(
      async ({
        supplierPaymentRepository,
        purchaseOrderRepository,
        auditLogger,
      }) => {
        const existing = await supplierPaymentRepository.findById(
          toSupplierPaymentId(id),
        );

        if (existing === null) {
          throw new NotFoundError({
            message: "Supplier payment not found",
            details: { id },
          });
        }

        let posted;

        try {
          posted = existing.withPosted();
        } catch (error) {
          if (error instanceof SupplierPaymentInvalidStatusError) {
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

        const purchaseOrder = await purchaseOrderRepository.findById(
          toPurchaseOrderId(existing.purchaseOrderId),
        );

        if (purchaseOrder === null) {
          throw new NotFoundError({
            message: "Purchase order not found",
            details: { purchaseOrderId: existing.purchaseOrderId },
          });
        }

        validatePurchaseOrderForSupplierPayment(
          purchaseOrder,
          existing.supplierId,
          existing.amount,
        );

        const previousPaymentValues = toSupplierPaymentAuditValues(existing);
        const previousPurchaseOrderValues =
          toPurchaseOrderAuditValues(purchaseOrder);

        const updatedPurchaseOrder = await applyPaymentToPurchaseOrder(
          purchaseOrderRepository,
          purchaseOrder,
          existing,
          "apply",
        );

        const updated = await supplierPaymentRepository.updateStatus(
          existing.id,
          {
            status: posted.status,
            postedAt: posted.postedAt,
          },
        );

        await auditLogger.log({
          module: SUPPLIER_PAYMENT_MODULE,
          entityName: SUPPLIER_PAYMENT_ENTITY_NAME,
          recordId: updated.id,
          action: "PAYMENT_RECEIVED",
          status: "SUCCESS",
          oldValues: previousPaymentValues,
          newValues: toSupplierPaymentAuditValues(updated),
        });

        await auditLogger.log({
          module: PURCHASE_ORDER_MODULE,
          entityName: PURCHASE_ORDER_ENTITY_NAME,
          recordId: updatedPurchaseOrder.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousPurchaseOrderValues,
          newValues: toPurchaseOrderAuditValues(updatedPurchaseOrder),
        });

        return toSupplierPaymentDto(updated);
      },
    );
  }
}
