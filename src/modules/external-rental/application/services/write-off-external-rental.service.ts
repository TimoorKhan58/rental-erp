import {
  EXTERNAL_RENTAL_ENTITY_NAME,
  EXTERNAL_RENTAL_MODULE,
  ExternalRentalInvalidStatusError,
  ExternalRentalInvalidWriteOffError,
  ExternalRentalInvariantError,
} from "@/modules/external-rental/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { ExternalRentalAgreementDto } from "../dtos/external-rental.dto";
import {
  toExternalRentalAgreementDto,
  toExternalRentalAgreementId,
  toExternalRentalWorkflowData,
  toRentalOrderItemId,
} from "../mappers/external-rental.mapper";
import {
  ExternalRentalIdParamSchema,
  WriteOffExternalRentalSchema,
  type ExternalRentalIdParamInput,
  type WriteOffExternalRentalInput,
} from "../schemas/external-rental.schemas";
import { toExternalRentalAuditValues } from "./external-rental-audit.mapper";
import type { IExternalRentalTransactionRunner } from "./external-rental-transaction.runner";

/**
 * Phase 27 — write off supplier-hire-in qty in company custody.
 * Never mutates Inventory.quantityOnHand / F-02 / reservedQuantity / settlement.
 */
export class WriteOffExternalRentalService {
  constructor(
    private readonly transactionRunner: IExternalRentalTransactionRunner,
  ) {}

  async execute(
    params: ExternalRentalIdParamInput,
    input: WriteOffExternalRentalInput,
  ): Promise<ExternalRentalAgreementDto> {
    const { id } = parseRequest(ExternalRentalIdParamSchema, params);
    const data = parseRequest(WriteOffExternalRentalSchema, input);

    return this.transactionRunner.run(
      async ({ externalRentalRepository, auditLogger }) => {
        const existing = await externalRentalRepository.findById(
          toExternalRentalAgreementId(id),
        );

        if (existing === null) {
          throw new NotFoundError({
            message: "External rental agreement not found",
            details: { id },
          });
        }

        let writtenOff;

        try {
          writtenOff = existing.withWrittenOff(
            data.items.map((item) => ({
              rentalOrderItemId: toRentalOrderItemId(item.rentalOrderItemId),
              quantity: item.quantity,
            })),
          );
        } catch (error) {
          if (
            error instanceof ExternalRentalInvalidStatusError ||
            error instanceof ExternalRentalInvalidWriteOffError ||
            error instanceof ExternalRentalInvariantError
          ) {
            throw new UnprocessableError({
              message: error.message,
              details:
                error instanceof ExternalRentalInvalidWriteOffError &&
                error.rentalOrderItemId !== undefined
                  ? { rentalOrderItemId: error.rentalOrderItemId }
                  : error instanceof ExternalRentalInvalidStatusError
                    ? {
                        currentStatus: error.currentStatus,
                        action: error.action,
                      }
                    : { field: (error as ExternalRentalInvariantError).field },
            });
          }

          throw error;
        }

        const previousValues = toExternalRentalAuditValues(existing);
        const updated = await externalRentalRepository.updateWorkflow(
          existing.id,
          toExternalRentalWorkflowData(writtenOff),
        );

        await auditLogger.log({
          module: EXTERNAL_RENTAL_MODULE,
          entityName: EXTERNAL_RENTAL_ENTITY_NAME,
          recordId: updated.id,
          // Existing AuditAction enum has no WRITE_OFF (no migration).
          // Identify write-off via UPDATE + writeOff payload (mirrors supplier return).
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: {
            ...toExternalRentalAuditValues(updated),
            writeOff: data.items.map((item) => ({
              rentalOrderItemId: item.rentalOrderItemId,
              quantity: item.quantity,
            })),
          },
        });

        return toExternalRentalAgreementDto(updated);
      },
    );
  }
}
