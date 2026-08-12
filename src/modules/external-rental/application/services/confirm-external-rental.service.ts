import {
  EXTERNAL_RENTAL_ENTITY_NAME,
  EXTERNAL_RENTAL_MODULE,
  ExternalRentalInvalidStatusError,
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
        const updated = await externalRentalRepository.updateWorkflow(
          existing.id,
          toExternalRentalWorkflowData(confirmed),
        );

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
