import {
  EXTERNAL_RENTAL_ENTITY_NAME,
  EXTERNAL_RENTAL_MODULE,
  ExternalRentalInvalidSettlementError,
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
} from "../mappers/external-rental.mapper";
import {
  ExternalRentalIdParamSchema,
  SettleExternalRentalSchema,
  type ExternalRentalIdParamInput,
  type SettleExternalRentalInput,
} from "../schemas/external-rental.schemas";
import { toExternalRentalAuditValues } from "./external-rental-audit.mapper";
import type { IExternalRentalTransactionRunner } from "./external-rental-transaction.runner";

/**
 * Records a payment against agreement amountDue (BD-10 / BD-11 MVP).
 * Does not create SupplierPayment. Orthogonal to operational RETURNED.
 */
export class SettleExternalRentalService {
  constructor(
    private readonly transactionRunner: IExternalRentalTransactionRunner,
  ) {}

  async execute(
    params: ExternalRentalIdParamInput,
    input: SettleExternalRentalInput,
  ): Promise<ExternalRentalAgreementDto> {
    const { id } = parseRequest(ExternalRentalIdParamSchema, params);
    const data = parseRequest(SettleExternalRentalSchema, input);

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

        let settled;

        try {
          settled = existing.withPaymentRecorded({
            paymentAmount: data.paymentAmount,
          });
        } catch (error) {
          if (
            error instanceof ExternalRentalInvalidStatusError ||
            error instanceof ExternalRentalInvalidSettlementError ||
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
                  : {
                      field:
                        error instanceof ExternalRentalInvalidSettlementError
                          ? error.field
                          : (error as ExternalRentalInvariantError).field,
                    },
            });
          }

          throw error;
        }

        const previousValues = toExternalRentalAuditValues(existing);
        const updated = await externalRentalRepository.updateWorkflow(
          existing.id,
          toExternalRentalWorkflowData(settled),
        );

        await auditLogger.log({
          module: EXTERNAL_RENTAL_MODULE,
          entityName: EXTERNAL_RENTAL_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: {
            ...toExternalRentalAuditValues(updated),
            paymentAmount: data.paymentAmount,
          },
        });

        return toExternalRentalAgreementDto(updated);
      },
    );
  }
}
