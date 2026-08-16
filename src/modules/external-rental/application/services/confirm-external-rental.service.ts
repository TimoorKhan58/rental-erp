import {
  EXTERNAL_RENTAL_ENTITY_NAME,
  EXTERNAL_RENTAL_MODULE,
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
  ConfirmExternalRentalSchema,
  ExternalRentalIdParamSchema,
  type ConfirmExternalRentalInput,
  type ExternalRentalIdParamInput,
} from "../schemas/external-rental.schemas";
import { toExternalRentalAuditValues } from "./external-rental-audit.mapper";
import type { IExternalRentalTransactionRunner } from "./external-rental-transaction.runner";

export class ConfirmExternalRentalService {
  constructor(
    private readonly transactionRunner: IExternalRentalTransactionRunner,
  ) {}

  async execute(
    params: ExternalRentalIdParamInput,
    input: ConfirmExternalRentalInput = {},
  ): Promise<ExternalRentalAgreementDto> {
    const { id } = parseRequest(ExternalRentalIdParamSchema, params);
    const data = parseRequest(ConfirmExternalRentalSchema, input);

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

        let confirmed;

        try {
          confirmed = existing.withConfirmed(
            data.items?.map((item) => ({
              rentalOrderItemId: toRentalOrderItemId(item.rentalOrderItemId),
              quantityConfirmed: item.quantityConfirmed,
            })),
          );
        } catch (error) {
          if (
            error instanceof ExternalRentalInvalidStatusError ||
            error instanceof ExternalRentalInvariantError
          ) {
            throw new UnprocessableError({
              message: error.message,
              details:
                error instanceof ExternalRentalInvalidStatusError
                  ? {
                      currentStatus: error.currentStatus,
                      action: error.action,
                    }
                  : { field: error.field },
            });
          }

          throw error;
        }

        const previousValues = toExternalRentalAuditValues(existing);

        // Phase 29 (F-02): atomic DRAFT → CONFIRMED status claim; per-item
        // quantityConfirmed set-absolute (once-only, guarded by the claim);
        // amountDue is set from the domain-computed provisional total
        // (quantityConfirmed × unitCost); totalHireInCost stays 0 until
        // Receive per BD-11.
        const baseDelta = computeExternalRentalWorkflowDelta({
          workflowKind: "confirm",
          before: existing,
          after: confirmed,
          expectedStatuses: ["DRAFT"],
          recomputeMoney: false,
        });
        const updated = await externalRentalRepository.applyWorkflowDelta(
          existing.id,
          {
            ...baseDelta,
            moneyOverride: {
              totalHireInCost: confirmed.totalHireInCost,
              amountDue: confirmed.amountDue,
              settlementStatus: confirmed.settlementStatus,
            },
          },
        );

        if (updated === null) {
          throw new ConcurrentUpdateError({
            entity: EXTERNAL_RENTAL_ENTITY_NAME,
            id: existing.id,
            expectedStatus: "DRAFT",
            action: "confirm",
          });
        }

        await auditLogger.log({
          module: EXTERNAL_RENTAL_MODULE,
          entityName: EXTERNAL_RENTAL_ENTITY_NAME,
          recordId: updated.id,
          action: "APPROVE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toExternalRentalAuditValues(updated),
        });

        return toExternalRentalAgreementDto(updated);
      },
    );
  }
}
