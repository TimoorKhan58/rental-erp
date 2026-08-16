import {
  EXTERNAL_RENTAL_ENTITY_NAME,
  EXTERNAL_RENTAL_MODULE,
  ExternalRentalInvalidAllocateError,
  ExternalRentalInvalidStatusError,
  ExternalRentalInvariantError,
} from "@/modules/external-rental/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  ConcurrentUpdateError,
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { ExternalRentalAgreementDto } from "../dtos/external-rental.dto";
import {
  computeExternalRentalWorkflowDelta,
  toExternalRentalAgreementDto,
  toExternalRentalAgreementId,
  toRentalOrderItemId,
} from "../mappers/external-rental.mapper";
import {
  AllocateExternalRentalSchema,
  ExternalRentalIdParamSchema,
  type AllocateExternalRentalInput,
  type ExternalRentalIdParamInput,
} from "../schemas/external-rental.schemas";
import { toExternalRentalAuditValues } from "./external-rental-audit.mapper";
import type { IExternalRentalTransactionRunner } from "./external-rental-transaction.runner";

/**
 * Allocates external custody qty to the linked rental-order item.
 * Does NOT mutate RentalOrderItem.reservedQuantity (owned-only).
 */
export class AllocateExternalRentalService {
  constructor(
    private readonly transactionRunner: IExternalRentalTransactionRunner,
  ) {}

  async execute(
    params: ExternalRentalIdParamInput,
    input: AllocateExternalRentalInput,
  ): Promise<ExternalRentalAgreementDto> {
    const { id } = parseRequest(ExternalRentalIdParamSchema, params);
    const data = parseRequest(AllocateExternalRentalSchema, input);

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

        let allocated;

        try {
          allocated = existing.withAllocated(
            data.items.map((item) => ({
              rentalOrderItemId: toRentalOrderItemId(item.rentalOrderItemId),
              quantity: item.quantity,
            })),
          );
        } catch (error) {
          if (
            error instanceof ExternalRentalInvalidStatusError ||
            error instanceof ExternalRentalInvalidAllocateError ||
            error instanceof ExternalRentalInvariantError
          ) {
            throw new UnprocessableError({
              message: error.message,
              details:
                error instanceof ExternalRentalInvalidAllocateError &&
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

        // Phase 29 (F-02): atomic parent status claim; per-item
        // quantityAllocated increment enforced by
        // `allocated + delta <= received` in DB.
        const updated = await externalRentalRepository.applyWorkflowDelta(
          existing.id,
          computeExternalRentalWorkflowDelta({
            workflowKind: "allocate",
            before: existing,
            after: allocated,
            expectedStatuses: [
              "PARTIALLY_RECEIVED",
              "RECEIVED",
              "ALLOCATED",
            ],
            recomputeMoney: false,
          }),
        );

        if (updated === null) {
          throw new ConcurrentUpdateError({
            entity: EXTERNAL_RENTAL_ENTITY_NAME,
            id: existing.id,
            expectedStatus: "PARTIALLY_RECEIVED|RECEIVED|ALLOCATED",
            action: "allocate",
          });
        }

        await auditLogger.log({
          module: EXTERNAL_RENTAL_MODULE,
          entityName: EXTERNAL_RENTAL_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toExternalRentalAuditValues(updated),
        });

        return toExternalRentalAgreementDto(updated);
      },
    );
  }
}
