import { postPaymentReceivedJournal } from "@/modules/accounting/application/services/operational-journal-posting.service";
import { toRentalInvoiceAuditValues } from "@/modules/rental-invoice/application/services/rental-invoice-audit.mapper";
import {
  RENTAL_INVOICE_ENTITY_NAME,
  RENTAL_INVOICE_MODULE,
} from "@/modules/rental-invoice/application/services/rental-invoice-service.constants";
import { PaymentInvalidStatusError } from "@/modules/payment/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  ConcurrentUpdateError,
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import {
  NOTIFICATION_EVENT_KEYS,
  enqueueWorkflowNotification,
} from "@/shared/infrastructure/notifications";

import type { PaymentDto } from "../dtos/payment.dto";
import {
  toPaymentDto,
  toPaymentId,
  toRentalInvoiceId,
  toUserId,
} from "../mappers/payment.mapper";
import {
  PaymentIdParamSchema,
  type PaymentIdParamInput,
} from "../schemas/payment.schemas";
import { toPaymentAuditValues } from "./payment-audit.mapper";
import {
  applyPaymentToInvoice,
  validateInvoiceForPayment,
} from "./payment-invoice.validation";
import {
  PAYMENT_ENTITY_NAME,
  PAYMENT_MODULE,
} from "./payment-service.constants";
import type { IPaymentTransactionRunner } from "./payment-transaction.runner";

export class PostPaymentService {
  constructor(
    private readonly transactionRunner: IPaymentTransactionRunner,
  ) {}

  async execute(params: PaymentIdParamInput): Promise<PaymentDto> {
    const { id } = parseRequest(PaymentIdParamSchema, params);

    return this.transactionRunner.run(
      async ({
        paymentRepository,
        rentalInvoiceRepository,
        accountRepository,
        journalEntryRepository,
        auditLogger,
        notificationService,
        db,
        userId,
      }) => {
        const existing = await paymentRepository.findById(toPaymentId(id));

        if (existing === null) {
          throw new NotFoundError({
            message: "Payment not found",
            details: { id },
          });
        }

        let posted;

        try {
          posted = existing.withPosted();
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

        const invoice = await rentalInvoiceRepository.findById(
          toRentalInvoiceId(existing.rentalInvoiceId),
        );

        if (invoice === null) {
          throw new NotFoundError({
            message: "Rental invoice not found",
            details: { rentalInvoiceId: existing.rentalInvoiceId },
          });
        }

        await rentalInvoiceRepository.lockForPaymentCommitment(invoice.id);

        const authoritativeInvoice = await rentalInvoiceRepository.findById(
          invoice.id,
        );

        if (authoritativeInvoice === null) {
          throw new NotFoundError({
            message: "Rental invoice not found",
            details: { rentalInvoiceId: existing.rentalInvoiceId },
          });
        }

        validateInvoiceForPayment(
          authoritativeInvoice,
          existing.customerId,
          existing.amount,
          {
            pendingAmount: await paymentRepository.sumPendingAmountByRentalInvoiceId(
              existing.rentalInvoiceId,
              existing.id,
            ),
          },
        );

        const previousPaymentValues = toPaymentAuditValues(existing);
        const previousInvoiceValues = toRentalInvoiceAuditValues(
          authoritativeInvoice,
        );

        const claimed = await paymentRepository.claimStatusTransition(
          existing.id,
          "PENDING",
          {
            status: posted.status,
            postedAt: posted.postedAt,
          },
        );

        if (claimed === null) {
          throw new ConcurrentUpdateError({
            entity: PAYMENT_ENTITY_NAME,
            id: existing.id,
            expectedStatus: "PENDING",
            action: "post",
          });
        }

        const updatedInvoice = await applyPaymentToInvoice(
          rentalInvoiceRepository,
          authoritativeInvoice.id,
          existing,
          "apply",
        );

        const updated = claimed;

        await auditLogger.log({
          module: PAYMENT_MODULE,
          entityName: PAYMENT_ENTITY_NAME,
          recordId: updated.id,
          action: "PAYMENT_RECEIVED",
          status: "SUCCESS",
          oldValues: previousPaymentValues,
          newValues: toPaymentAuditValues(updated),
        });

        await auditLogger.log({
          module: RENTAL_INVOICE_MODULE,
          entityName: RENTAL_INVOICE_ENTITY_NAME,
          recordId: updatedInvoice.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousInvoiceValues,
          newValues: toRentalInvoiceAuditValues(updatedInvoice),
        });

        await enqueueWorkflowNotification(notificationService, db, {
          eventKey: NOTIFICATION_EVENT_KEYS.PAYMENT_POSTED,
          module: PAYMENT_MODULE,
          entityName: PAYMENT_ENTITY_NAME,
          recordId: updated.id,
          recipientUserIds: [updated.createdById],
          data: {
            paymentNumber: updated.paymentNumber,
            invoiceNumber: updatedInvoice.invoiceNumber,
            amount: updated.amount,
          },
        });

        if (userId !== undefined) {
          await postPaymentReceivedJournal(
            {
              accountRepository,
              journalEntryRepository,
              userId: toUserId(userId),
            },
            {
              paymentId: updated.id,
              paymentNumber: updated.paymentNumber,
              paymentDate: updated.paymentDate,
              amount: updated.amount,
            },
          );
        }

        return toPaymentDto(updated);
      },
    );
  }
}
