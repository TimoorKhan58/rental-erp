import {
  EXTERNAL_RENTAL_ENTITY_NAME,
  EXTERNAL_RENTAL_MODULE,
  type ExternalRentalAgreementStatus,
  ExternalRentalInvalidStatusError,
  ExternalRentalInvalidSupplierReturnError,
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
  ExternalRentalIdParamSchema,
  SupplierReturnExternalRentalSchema,
  type ExternalRentalIdParamInput,
  type SupplierReturnExternalRentalInput,
} from "../schemas/external-rental.schemas";
import { toExternalRentalAuditValues } from "./external-rental-audit.mapper";
import type { IExternalRentalTransactionRunner } from "./external-rental-transaction.runner";

/**
 * Returns external custody qty to the supplier (Phase 25.5.5).
 * Never mutates Inventory.quantityOnHand / F-02 / reservedQuantity.
 */
export class SupplierReturnExternalRentalService {
  constructor(
    private readonly transactionRunner: IExternalRentalTransactionRunner,
  ) {}

  async execute(
    params: ExternalRentalIdParamInput,
    input: SupplierReturnExternalRentalInput,
  ): Promise<ExternalRentalAgreementDto> {
    const { id } = parseRequest(ExternalRentalIdParamSchema, params);
    const data = parseRequest(SupplierReturnExternalRentalSchema, input);

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

        let returned;

        try {
          returned = existing.withSupplierReturned(
            data.items.map((item) => ({
              rentalOrderItemId: toRentalOrderItemId(item.rentalOrderItemId),
              quantity: item.quantity,
            })),
          );
        } catch (error) {
          if (
            error instanceof ExternalRentalInvalidStatusError ||
            error instanceof ExternalRentalInvalidSupplierReturnError ||
            error instanceof ExternalRentalInvariantError
          ) {
            throw new UnprocessableError({
              message: error.message,
              details:
                error instanceof ExternalRentalInvalidSupplierReturnError &&
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
        // quantityReturnedToSupplier increment enforced by
        // supplier-return capacity predicate in DB.
        const allowedStatuses: readonly ExternalRentalAgreementStatus[] = [
          "PARTIALLY_RECEIVED",
          "RECEIVED",
          "ALLOCATED",
          "IN_USE",
          "RETURN_PENDING",
        ];
        const updated = await externalRentalRepository.applyWorkflowDelta(
          existing.id,
          computeExternalRentalWorkflowDelta({
            workflowKind: "supplier-return",
            before: existing,
            after: returned,
            expectedStatuses: allowedStatuses,
            recomputeMoney: false,
          }),
        );

        if (updated === null) {
          throw new ConcurrentUpdateError({
            entity: EXTERNAL_RENTAL_ENTITY_NAME,
            id: existing.id,
            expectedStatus: allowedStatuses.join("|"),
            action: "supplier-return",
          });
        }

        await auditLogger.log({
          module: EXTERNAL_RENTAL_MODULE,
          entityName: EXTERNAL_RENTAL_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: {
            ...toExternalRentalAuditValues(updated),
            supplierReturn: data.items.map((item) => ({
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
