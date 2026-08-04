import { resolveDocumentCode } from "@/modules/settings/application/services/resolve-document-code";
import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";
import {
  SupplierPayment,
  SupplierPaymentInvariantError,
} from "@/modules/supplier-payment/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { SupplierPaymentDto } from "../dtos/supplier-payment.dto";
import {
  toCreateSupplierPaymentData,
  toPurchaseOrderId,
  toSupplierPaymentDto,
  toUserId,
} from "../mappers/supplier-payment.mapper";
import {
  CreateSupplierPaymentSchema,
  type CreateSupplierPaymentInput,
} from "../schemas/supplier-payment.schemas";
import { toSupplierPaymentAuditValues } from "./supplier-payment-audit.mapper";
import { validatePurchaseOrderForSupplierPayment } from "./supplier-payment-purchase-order.validation";
import {
  SUPPLIER_PAYMENT_ENTITY_NAME,
  SUPPLIER_PAYMENT_MODULE,
} from "./supplier-payment-service.constants";
import type { ISupplierPaymentTransactionRunner } from "./supplier-payment-transaction.runner";

export class CreateSupplierPaymentService {
  constructor(
    private readonly transactionRunner: ISupplierPaymentTransactionRunner,
    private readonly numberSequences: INumberSequenceRepository,
  ) {}

  async execute(
    input: CreateSupplierPaymentInput,
  ): Promise<SupplierPaymentDto> {
    const data = parseRequest(CreateSupplierPaymentSchema, input);
    const paymentNumber = await resolveDocumentCode(
      this.numberSequences,
      "SUPPLIER_PAYMENT",
      data.paymentNumber,
    );

    return this.transactionRunner.run(
      async ({
        supplierPaymentRepository,
        purchaseOrderRepository,
        auditLogger,
        userId,
      }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to create supplier payment",
          });
        }

        const createData = toCreateSupplierPaymentData(
          { ...data, paymentNumber },
          toUserId(userId),
        );

        try {
          SupplierPayment.create(createData);
        } catch (error) {
          if (error instanceof SupplierPaymentInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        const purchaseOrder = await purchaseOrderRepository.findById(
          toPurchaseOrderId(data.purchaseOrderId),
        );

        if (purchaseOrder === null) {
          throw new NotFoundError({
            message: "Purchase order not found",
            details: { purchaseOrderId: data.purchaseOrderId },
          });
        }

        validatePurchaseOrderForSupplierPayment(
          purchaseOrder,
          data.supplierId,
          data.amount,
        );

        const existing = await supplierPaymentRepository.findByPaymentNumber(
          createData.paymentNumber,
        );

        if (existing !== null) {
          throw new ConflictError({
            message: "Supplier payment number already exists",
            details: { paymentNumber: createData.paymentNumber },
          });
        }

        const payment = await supplierPaymentRepository.create(createData);

        await auditLogger.log({
          module: SUPPLIER_PAYMENT_MODULE,
          entityName: SUPPLIER_PAYMENT_ENTITY_NAME,
          recordId: payment.id,
          action: "CREATE",
          status: "SUCCESS",
          newValues: toSupplierPaymentAuditValues(payment),
        });

        return toSupplierPaymentDto(payment);
      },
    );
  }
}
