import {
  DispatchInvalidStatusError,
  DispatchInvariantError,
  validateDispatchItems,
} from "@/modules/dispatch/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { DispatchDto } from "../dtos/dispatch.dto";
import {
  toDispatchDto,
  toDispatchId,
  toUpdateDispatchData,
} from "../mappers/dispatch.mapper";
import {
  DispatchIdParamSchema,
  UpdateDispatchSchema,
  type DispatchIdParamInput,
  type UpdateDispatchInput,
} from "../schemas/dispatch.schemas";
import { toDispatchAuditValues } from "./dispatch-audit.mapper";
import { validateRentalOrderForDispatch } from "./dispatch-rental-order.validation";
import {
  DISPATCH_ENTITY_NAME,
  DISPATCH_MODULE,
} from "./dispatch-service.constants";
import type { IDispatchTransactionRunner } from "./dispatch-transaction.runner";

export class UpdateDispatchService {
  constructor(
    private readonly transactionRunner: IDispatchTransactionRunner,
  ) {}

  async execute(
    params: DispatchIdParamInput,
    input: UpdateDispatchInput,
  ): Promise<DispatchDto> {
    const { id } = parseRequest(DispatchIdParamSchema, params);
    const data = parseRequest(UpdateDispatchSchema, input);
    const updateData = toUpdateDispatchData(data);

    if (updateData.items !== undefined) {
      try {
        validateDispatchItems(updateData.items);
      } catch (error) {
        if (error instanceof DispatchInvariantError) {
          throw new UnprocessableError({
            message: error.message,
            details: { field: error.field },
          });
        }

        throw error;
      }
    }

    return this.transactionRunner.run(
      async ({ dispatchRepository, rentalOrderRepository, auditLogger }) => {
        const existing = await dispatchRepository.findById(toDispatchId(id));

        if (existing === null) {
          throw new NotFoundError({
            message: "Dispatch not found",
            details: { id },
          });
        }

        try {
          existing.assertCanUpdate();
        } catch (error) {
          if (error instanceof DispatchInvalidStatusError) {
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

        if (updateData.items !== undefined) {
          const rentalOrder = await rentalOrderRepository.findById(
            existing.rentalOrderId,
          );

          if (rentalOrder === null) {
            throw new NotFoundError({
              message: "Rental order not found",
              details: { rentalOrderId: existing.rentalOrderId },
            });
          }

          validateRentalOrderForDispatch(rentalOrder, updateData.items);
        }

        const previousValues = toDispatchAuditValues(existing);
        const { markReady, ...persistableUpdate } = updateData;
        const hasPersistableUpdate = Object.keys(persistableUpdate).length > 0;

        let updated = existing;

        if (hasPersistableUpdate) {
          updated = await dispatchRepository.update(existing.id, persistableUpdate);
        }

        if (markReady === true) {
          try {
            updated = updated.withReady();
          } catch (error) {
            if (error instanceof DispatchInvalidStatusError) {
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

          updated = await dispatchRepository.updateStatus(updated.id, updated.status, {
            readyAt: updated.readyAt,
          });
        }

        await auditLogger.log({
          module: DISPATCH_MODULE,
          entityName: DISPATCH_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toDispatchAuditValues(updated),
        });

        return toDispatchDto(updated);
      },
    );
  }
}
