import {
  EXTERNAL_RENTAL_ENTITY_NAME,
  EXTERNAL_RENTAL_MODULE,
  ExternalRentalInvalidStatusError,
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
} from "../mappers/external-rental.mapper";
import {
  ExternalRentalIdParamSchema,
  type ExternalRentalIdParamInput,
} from "../schemas/external-rental.schemas";
import { toExternalRentalAuditValues } from "./external-rental-audit.mapper";
import type { IExternalRentalTransactionRunner } from "./external-rental-transaction.runner";

export class CancelExternalRentalService {
  constructor(
    private readonly transactionRunner: IExternalRentalTransactionRunner,
  ) {}

  async execute(
    params: ExternalRentalIdParamInput,
  ): Promise<ExternalRentalAgreementDto> {
    const { id } = parseRequest(ExternalRentalIdParamSchema, params);

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

        let cancelled;

        try {
          cancelled = existing.withCancelled();
        } catch (error) {
          if (error instanceof ExternalRentalInvalidStatusError) {
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

        const previousValues = toExternalRentalAuditValues(existing);
        const updated = await externalRentalRepository.updateWorkflow(
          existing.id,
          toExternalRentalWorkflowData(cancelled),
        );

        await auditLogger.log({
          module: EXTERNAL_RENTAL_MODULE,
          entityName: EXTERNAL_RENTAL_ENTITY_NAME,
          recordId: updated.id,
          action: "CANCEL",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toExternalRentalAuditValues(updated),
        });

        return toExternalRentalAgreementDto(updated);
      },
    );
  }
}
