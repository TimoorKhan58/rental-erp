import { postRentalInvoiceIssuedJournal } from "@/modules/accounting/application/services/operational-journal-posting.service";
import { RentalInvoiceInvalidStatusError } from "@/modules/rental-invoice/domain";
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

import type { RentalInvoiceDto } from "../dtos/rental-invoice.dto";
import {
  toRentalInvoiceDto,
  toRentalInvoiceId,
  toUserId,
} from "../mappers/rental-invoice.mapper";
import {
  RentalInvoiceIdParamSchema,
  type RentalInvoiceIdParamInput,
} from "../schemas/rental-invoice.schemas";
import { toRentalInvoiceAuditValues } from "./rental-invoice-audit.mapper";
import {
  RENTAL_INVOICE_ENTITY_NAME,
  RENTAL_INVOICE_MODULE,
} from "./rental-invoice-service.constants";
import type { IRentalInvoiceTransactionRunner } from "./rental-invoice-transaction.runner";

export class IssueRentalInvoiceService {
  constructor(
    private readonly transactionRunner: IRentalInvoiceTransactionRunner,
  ) {}

  async execute(params: RentalInvoiceIdParamInput): Promise<RentalInvoiceDto> {
    const { id } = parseRequest(RentalInvoiceIdParamSchema, params);

    return this.transactionRunner.run(
      async ({
        rentalInvoiceRepository,
        accountRepository,
        journalEntryRepository,
        auditLogger,
        notificationService,
        db,
        userId,
      }) => {
        const existing = await rentalInvoiceRepository.findById(
          toRentalInvoiceId(id),
        );

        if (existing === null) {
          throw new NotFoundError({
            message: "Rental invoice not found",
            details: { id },
          });
        }

        let issued;

        try {
          issued = existing.withIssued();
        } catch (error) {
          if (error instanceof RentalInvoiceInvalidStatusError) {
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

        const previousValues = toRentalInvoiceAuditValues(existing);
        const claimed = await rentalInvoiceRepository.claimStatusTransition(
          existing.id,
          "DRAFT",
          {
            status: issued.status,
            issuedAt: issued.issuedAt,
          },
        );

        if (claimed === null) {
          throw new ConcurrentUpdateError({
            entity: RENTAL_INVOICE_ENTITY_NAME,
            id: existing.id,
            expectedStatus: "DRAFT",
            action: "issue",
          });
        }

        await auditLogger.log({
          module: RENTAL_INVOICE_MODULE,
          entityName: RENTAL_INVOICE_ENTITY_NAME,
          recordId: claimed.id,
          action: "APPROVE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toRentalInvoiceAuditValues(claimed),
        });

        await enqueueWorkflowNotification(notificationService, db, {
          eventKey: NOTIFICATION_EVENT_KEYS.RENTAL_INVOICE_ISSUED,
          module: RENTAL_INVOICE_MODULE,
          entityName: RENTAL_INVOICE_ENTITY_NAME,
          recordId: claimed.id,
          recipientUserIds: [claimed.createdById],
          data: { invoiceNumber: claimed.invoiceNumber },
        });

        if (userId !== undefined) {
          await postRentalInvoiceIssuedJournal(
            {
              accountRepository,
              journalEntryRepository,
              userId: toUserId(userId),
            },
            {
              invoiceId: claimed.id,
              invoiceNumber: claimed.invoiceNumber,
              invoiceDate: claimed.invoiceDate,
              amount: claimed.grandTotal,
            },
          );
        }

        return toRentalInvoiceDto(claimed);
      },
    );
  }
}
