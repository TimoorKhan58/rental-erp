import { RentalInvoiceInvalidStatusError } from "@/modules/rental-invoice/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  ConcurrentUpdateError,
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { RentalInvoiceDto } from "../dtos/rental-invoice.dto";
import {
  toRentalInvoiceDto,
  toRentalInvoiceId,
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
import { assertInvoiceVoidWithoutPostedPayments } from "./assert-invoice-void-without-posted-payments";
import type { IRentalInvoiceTransactionRunner } from "./rental-invoice-transaction.runner";

export class VoidRentalInvoiceService {
  constructor(
    private readonly transactionRunner: IRentalInvoiceTransactionRunner,
  ) {}

  async execute(params: RentalInvoiceIdParamInput): Promise<RentalInvoiceDto> {
    const { id } = parseRequest(RentalInvoiceIdParamSchema, params);

    return this.transactionRunner.run(
      async ({ rentalInvoiceRepository, paymentRepository, auditLogger }) => {
        const invoiceId = toRentalInvoiceId(id);
        const existing = await rentalInvoiceRepository.findById(invoiceId);

        if (existing === null) {
          throw new NotFoundError({
            message: "Rental invoice not found",
            details: { id },
          });
        }

        await rentalInvoiceRepository.lockForPaymentCommitment(invoiceId);
        await assertInvoiceVoidWithoutPostedPayments(
          paymentRepository,
          invoiceId,
        );

        let voided;

        try {
          voided = existing.withVoided();
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
          ["DRAFT", "ISSUED", "PARTIALLY_PAID"],
          {
            status: voided.status,
            voidedAt: voided.voidedAt,
          },
        );

        if (claimed === null) {
          throw new ConcurrentUpdateError({
            entity: RENTAL_INVOICE_ENTITY_NAME,
            id: existing.id,
            expectedStatus: "DRAFT|ISSUED|PARTIALLY_PAID",
            action: "void",
          });
        }

        await auditLogger.log({
          module: RENTAL_INVOICE_MODULE,
          entityName: RENTAL_INVOICE_ENTITY_NAME,
          recordId: claimed.id,
          action: "CANCEL",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toRentalInvoiceAuditValues(claimed),
        });

        return toRentalInvoiceDto(claimed);
      },
    );
  }
}
