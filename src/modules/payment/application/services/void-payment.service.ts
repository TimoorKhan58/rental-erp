import { toRentalInvoiceAuditValues } from "@/modules/rental-invoice/application/services/rental-invoice-audit.mapper";
import {
  RENTAL_INVOICE_ENTITY_NAME,
  RENTAL_INVOICE_MODULE,
} from "@/modules/rental-invoice/application/services/rental-invoice-service.constants";
import { PaymentInvalidStatusError } from "@/modules/payment/domain";
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
} from "../mappers/payment.mapper";
import {
  PaymentIdParamSchema,
  type PaymentIdParamInput,
} from "../schemas/payment.schemas";
import { toPaymentAuditValues } from "./payment-audit.mapper";
import { applyPaymentToInvoice } from "./payment-invoice.validation";
import {
  PAYMENT_ENTITY_NAME,
  PAYMENT_MODULE,
} from "./payment-service.constants";
import type { IPaymentTransactionRunner } from "./payment-transaction.runner";

export class VoidPaymentService {
  constructor(
    private readonly transactionRunner: IPaymentTransactionRunner,
  ) {}

  async execute(params: PaymentIdParamInput): Promise<PaymentDto> {
    const { id } = parseRequest(PaymentIdParamSchema, params);

    return this.transactionRunner.run(
      async ({ paymentRepository, rentalInvoiceRepository, auditLogger }) => {
        const existing = await paymentRepository.findById(toPaymentId(id));

        if (existing === null) {
          throw new NotFoundError({
            message: "Payment not found",
            details: { id },
          });
        }

        let voided;

        try {
          voided = existing.withVoided();
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

          throw error;
        }

        const previousPaymentValues = toPaymentAuditValues(existing);

        if (existing.isPosted()) {
          const invoice = await rentalInvoiceRepository.findById(
            toRentalInvoiceId(existing.rentalInvoiceId),
          );

          if (invoice === null) {
            throw new NotFoundError({
              message: "Rental invoice not found",
              details: { rentalInvoiceId: existing.rentalInvoiceId },
            });
          }

          const previousInvoiceValues = toRentalInvoiceAuditValues(invoice);

          const updatedInvoice = await applyPaymentToInvoice(
            rentalInvoiceRepository,
            invoice,
            existing,
            "reverse",
          );

          await auditLogger.log({
            module: RENTAL_INVOICE_MODULE,
            entityName: RENTAL_INVOICE_ENTITY_NAME,
            recordId: updatedInvoice.id,
            action: "UPDATE",
            status: "SUCCESS",
            oldValues: previousInvoiceValues,
            newValues: toRentalInvoiceAuditValues(updatedInvoice),
          });
        }

        const updated = await paymentRepository.updateStatus(existing.id, {
          status: voided.status,
          voidedAt: voided.voidedAt,
        });

        await auditLogger.log({
          module: PAYMENT_MODULE,
          entityName: PAYMENT_ENTITY_NAME,
          recordId: updated.id,
          action: "CANCEL",
          status: "SUCCESS",
          oldValues: previousPaymentValues,
          newValues: toPaymentAuditValues(updated),
        });

        return toPaymentDto(updated);
      },
    );
  }
}
