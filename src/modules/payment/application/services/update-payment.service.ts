import {
  PaymentInvalidStatusError,
  PaymentInvariantError,
} from "@/modules/payment/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { PaymentDto } from "../dtos/payment.dto";
import {
  toPaymentDto,
  toPaymentId,
  toRentalInvoiceId,
  toUpdatePaymentData,
} from "../mappers/payment.mapper";
import {
  PaymentIdParamSchema,
  UpdatePaymentSchema,
  type PaymentIdParamInput,
  type UpdatePaymentInput,
} from "../schemas/payment.schemas";
import { toPaymentAuditValues } from "./payment-audit.mapper";
import { validateInvoiceForPayment } from "./payment-invoice.validation";
import {
  PAYMENT_ENTITY_NAME,
  PAYMENT_MODULE,
} from "./payment-service.constants";
import type { IPaymentTransactionRunner } from "./payment-transaction.runner";

export class UpdatePaymentService {
  constructor(
    private readonly transactionRunner: IPaymentTransactionRunner,
  ) {}

  async execute(
    params: PaymentIdParamInput,
    input: UpdatePaymentInput,
  ): Promise<PaymentDto> {
    const { id } = parseRequest(PaymentIdParamSchema, params);
    const data = parseRequest(UpdatePaymentSchema, input);
    const updateData = toUpdatePaymentData(data);

    return this.transactionRunner.run(
      async ({ paymentRepository, rentalInvoiceRepository, auditLogger }) => {
        const existing = await paymentRepository.findById(toPaymentId(id));

        if (existing === null) {
          throw new NotFoundError({
            message: "Payment not found",
            details: { id },
          });
        }

        try {
          existing.assertCanUpdate();
          existing.withUpdated(updateData);
        } catch (error) {
          if (error instanceof PaymentInvalidStatusError) {
            throw new UnprocessableError({
              message: error.message,
              details: {
                currentStatus: error.currentStatus,
                action: error.action,
              },
            });
          }

          if (error instanceof PaymentInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        const invoice = await rentalInvoiceRepository.findById(
          toRentalInvoiceId(existing.rentalInvoiceId),
        );

        if (invoice === null) {
          throw new NotFoundError({
            message: "Rental invoice not found",
            details: { rentalInvoiceId: existing.rentalInvoiceId },
          });
        }

        const nextAmount = updateData.amount ?? existing.amount;
        validateInvoiceForPayment(invoice, existing.customerId, nextAmount);

        const previousValues = toPaymentAuditValues(existing);
        const updated = await paymentRepository.update(existing.id, updateData);

        await auditLogger.log({
          module: PAYMENT_MODULE,
          entityName: PAYMENT_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toPaymentAuditValues(updated),
        });

        return toPaymentDto(updated);
      },
    );
  }
}
