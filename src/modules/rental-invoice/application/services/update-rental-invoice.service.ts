import {
  RentalInvoiceInvalidStatusError,
  RentalInvoiceInvariantError,
} from "@/modules/rental-invoice/domain";
import { validateRentalInvoiceItems } from "@/modules/rental-invoice/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { RentalInvoiceDto } from "../dtos/rental-invoice.dto";
import {
  toRentalInvoiceDto,
  toRentalInvoiceId,
  toUpdateRentalInvoiceData,
} from "../mappers/rental-invoice.mapper";
import {
  RentalInvoiceIdParamSchema,
  UpdateRentalInvoiceSchema,
  type RentalInvoiceIdParamInput,
  type UpdateRentalInvoiceInput,
} from "../schemas/rental-invoice.schemas";
import { toRentalInvoiceAuditValues } from "./rental-invoice-audit.mapper";
import {
  RENTAL_INVOICE_ENTITY_NAME,
  RENTAL_INVOICE_MODULE,
} from "./rental-invoice-service.constants";
import type { IRentalInvoiceTransactionRunner } from "./rental-invoice-transaction.runner";

export class UpdateRentalInvoiceService {
  constructor(
    private readonly transactionRunner: IRentalInvoiceTransactionRunner,
  ) {}

  async execute(
    params: RentalInvoiceIdParamInput,
    input: UpdateRentalInvoiceInput,
  ): Promise<RentalInvoiceDto> {
    const { id } = parseRequest(RentalInvoiceIdParamSchema, params);
    const data = parseRequest(UpdateRentalInvoiceSchema, input);
    const updateData = toUpdateRentalInvoiceData(data);

    if (updateData.items !== undefined) {
      try {
        validateRentalInvoiceItems(updateData.items);
      } catch (error) {
        if (error instanceof RentalInvoiceInvariantError) {
          throw new UnprocessableError({
            message: error.message,
            details: { field: error.field },
          });
        }

        throw error;
      }
    }

    return this.transactionRunner.run(
      async ({ rentalInvoiceRepository, auditLogger }) => {
        const existing = await rentalInvoiceRepository.findById(
          toRentalInvoiceId(id),
        );

        if (existing === null) {
          throw new NotFoundError({
            message: "Rental invoice not found",
            details: { id },
          });
        }

        try {
          existing.assertCanUpdate();
          existing.withUpdated(updateData);
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

          if (error instanceof RentalInvoiceInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        const previousValues = toRentalInvoiceAuditValues(existing);
        const updated = await rentalInvoiceRepository.update(
          existing.id,
          updateData,
        );

        await auditLogger.log({
          module: RENTAL_INVOICE_MODULE,
          entityName: RENTAL_INVOICE_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toRentalInvoiceAuditValues(updated),
        });

        return toRentalInvoiceDto(updated);
      },
    );
  }
}
