import {
  EXTERNAL_RENTAL_ENTITY_NAME,
  EXTERNAL_RENTAL_MODULE,
  ExternalRentalInvalidReceiveError,
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
  ExternalRentalIdParamSchema,
  ReceiveExternalRentalSchema,
  type ExternalRentalIdParamInput,
  type ReceiveExternalRentalInput,
} from "../schemas/external-rental.schemas";
import { toExternalRentalAuditValues } from "./external-rental-audit.mapper";
import type { IExternalRentalTransactionRunner } from "./external-rental-transaction.runner";

/**
 * External custody receive.
 * Recognizes hire-in cost on the agreement (BD-11).
 * NEVER mutates Inventory.quantityOnHand or creates owned stock movements.
 */
export class ReceiveExternalRentalService {
  constructor(
    private readonly transactionRunner: IExternalRentalTransactionRunner,
  ) {}

  async execute(
    params: ExternalRentalIdParamInput,
    input: ReceiveExternalRentalInput,
  ): Promise<ExternalRentalAgreementDto> {
    const { id } = parseRequest(ExternalRentalIdParamSchema, params);
    const data = parseRequest(ReceiveExternalRentalSchema, input);

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

        let received;

        try {
          received = existing.withReceived(
            data.items.map((item) => ({
              rentalOrderItemId: toRentalOrderItemId(item.rentalOrderItemId),
              quantity: item.quantity,
            })),
          );
        } catch (error) {
          if (
            error instanceof ExternalRentalInvalidStatusError ||
            error instanceof ExternalRentalInvalidReceiveError ||
            error instanceof ExternalRentalInvariantError
          ) {
            throw new UnprocessableError({
              message: error.message,
              details:
                error instanceof ExternalRentalInvalidReceiveError &&
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
          toExternalRentalWorkflowData(received),
        );

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
