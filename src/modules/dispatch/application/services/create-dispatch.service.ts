import { resolveDocumentCode } from "@/modules/settings/application/services/resolve-document-code";
import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";
import { Dispatch } from "@/modules/dispatch/domain";
import {
  DispatchInvariantError,
  sumClaimedSourceDispatchQuantitiesByRentalOrderItem,
} from "@/modules/dispatch/domain";
import type { ExternalRentalAgreement } from "@/modules/external-rental/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { DispatchDto } from "../dtos/dispatch.dto";
import {
  toCreateDispatchData,
  toDispatchDto,
  toRentalOrderId,
  toUserId,
} from "../mappers/dispatch.mapper";
import {
  CreateDispatchSchema,
  type CreateDispatchInput,
} from "../schemas/dispatch.schemas";
import { toDispatchAuditValues } from "./dispatch-audit.mapper";
import { validateRentalOrderForDispatch } from "./dispatch-rental-order.validation";
import {
  DISPATCH_ENTITY_NAME,
  DISPATCH_MODULE,
} from "./dispatch-service.constants";
import type { IDispatchTransactionRunner } from "./dispatch-transaction.runner";

function buildExternalRemainingByItem(
  agreement: ExternalRentalAgreement | null,
  claimedExternal: Map<string, number>,
): Map<string, number> {
  const remaining = new Map<string, number>();

  if (agreement === null) {
    return remaining;
  }

  for (const item of agreement.items) {
    const claimed = claimedExternal.get(item.rentalOrderItemId) ?? 0;
    remaining.set(
      item.rentalOrderItemId,
      Math.max(0, item.quantityAllocated - claimed),
    );
  }

  return remaining;
}

export class CreateDispatchService {
  constructor(
    private readonly transactionRunner: IDispatchTransactionRunner,
    private readonly numberSequences: INumberSequenceRepository,
  ) {}

  async execute(input: CreateDispatchInput): Promise<DispatchDto> {
    const data = parseRequest(CreateDispatchSchema, input);
    const dispatchNumber = await resolveDocumentCode(
      this.numberSequences,
      "DISPATCH",
      data.dispatchNumber,
    );

    return this.transactionRunner.run(
      async ({
        dispatchRepository,
        rentalOrderRepository,
        externalRentalRepository,
        auditLogger,
        userId,
      }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to create dispatch",
          });
        }

        const createData = toCreateDispatchData(
          { ...data, dispatchNumber },
          toUserId(userId),
        );

        try {
          Dispatch.create(createData);
        } catch (error) {
          if (error instanceof DispatchInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        const rentalOrder = await rentalOrderRepository.findById(
          toRentalOrderId(data.rentalOrderId),
        );

        if (rentalOrder === null) {
          throw new NotFoundError({
            message: "Rental order not found",
            details: { rentalOrderId: data.rentalOrderId },
          });
        }

        const existingForOrder = await dispatchRepository.findPaged({
          page: 1,
          pageSize: 100,
          sortOrder: "desc",
          rentalOrderId: rentalOrder.id,
        });
        const claimedSources = sumClaimedSourceDispatchQuantitiesByRentalOrderItem(
          existingForOrder.items,
        );

        const agreement = await externalRentalRepository.findActiveByRentalOrderId(
          rentalOrder.id,
        );
        const externalRemaining = buildExternalRemainingByItem(
          agreement,
          claimedSources.external,
        );

        const resolvedItems = validateRentalOrderForDispatch(
          rentalOrder,
          createData.items,
          claimedSources.owned,
          externalRemaining,
        );

        const existing = await dispatchRepository.findByDispatchNumber(
          createData.dispatchNumber,
        );

        if (existing !== null) {
          throw new ConflictError({
            message: "Dispatch number already exists",
            details: { dispatchNumber: createData.dispatchNumber },
          });
        }

        const dispatch = await dispatchRepository.create({
          ...createData,
          items: resolvedItems,
        });

        await auditLogger.log({
          module: DISPATCH_MODULE,
          entityName: DISPATCH_ENTITY_NAME,
          recordId: dispatch.id,
          action: "CREATE",
          status: "SUCCESS",
          newValues: toDispatchAuditValues(dispatch),
        });

        return toDispatchDto(dispatch);
      },
    );
  }
}
