import {
  EXTERNAL_RENTAL_ENTITY_NAME,
  EXTERNAL_RENTAL_MODULE,
  ExternalRentalInvalidSettlementError,
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
  toExternalRentalAgreementDto,
  toExternalRentalAgreementId,
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

        // Phase 29 (F-02 / decision §10.2): domain validation on stale
        // aggregate still runs to preserve status/positive-amount rules,
        // but the persistence uses a predicated raw SQL UPDATE so the
        // additive invariant amountPaid + delta <= amountDue is enforced
        // atomically by the database (two valid concurrent partials both
        // succeed additively; an overshoot returns null and we surface 409).
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

        const updated = await externalRentalRepository.applySettlement(
          existing.id,
          data.paymentAmount,
        );

        if (updated === null) {
          throw new ConcurrentUpdateError({
            entity: EXTERNAL_RENTAL_ENTITY_NAME,
            id: existing.id,
            action: "settle",
          });
        }

        void settled;

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
