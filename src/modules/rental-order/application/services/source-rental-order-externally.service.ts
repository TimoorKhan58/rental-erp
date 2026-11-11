import { executeCreateExternalRentalInScope } from "@/modules/external-rental/application/services/create-external-rental-in-scope";
import type { ExternalRentalAgreementDto } from "@/modules/external-rental/application/dtos/external-rental.dto";
import { toCreateExternalRentalAgreementData, toUserId, toRentalOrderItemId } from "@/modules/external-rental/application/mappers/external-rental.mapper";
import { resolveDocumentCode } from "@/modules/settings/application/services/resolve-document-code";
import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";
import type { ISupplierRepository } from "@/modules/supplier/domain/supplier.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import type { SupplierId } from "@/shared/domain/ids";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import { toRentalOrderId } from "../mappers/rental-order.mapper";
import {
  RentalOrderIdParamSchema,
  type RentalOrderIdParamInput,
} from "../schemas/rental-order.schemas";
import {
  SourceRentalOrderExternallySchema,
  type SourceRentalOrderExternallyInput,
} from "../schemas/source-rental-order-externally.schema";
import { assertExternalSourcingF02Gate } from "./assert-external-sourcing-f02-gate";
import type { IRentalOrderTransactionRunner } from "./rental-order-transaction.runner";

/**
 * Phase 26 — operator "Source Externally" orchestration.
 * Phase 48 (N-46-02) — F-02 shortfall validated under inventory + RO locks
 * in the same UoW as ERA creation.
 * Phase 53 (N-48-01) — shared F-02 gate with direct ERA create path.
 */
export class SourceRentalOrderExternallyService {
  constructor(
    private readonly transactionRunner: IRentalOrderTransactionRunner,
    private readonly supplierRepository: ISupplierRepository,
    private readonly numberSequences: INumberSequenceRepository,
    private readonly userId: string | undefined,
  ) {}

  async execute(
    params: RentalOrderIdParamInput,
    input: SourceRentalOrderExternallyInput,
  ): Promise<ExternalRentalAgreementDto> {
    const { id } = parseRequest(RentalOrderIdParamSchema, params);
    const data = parseRequest(SourceRentalOrderExternallySchema, input);
    const rentalOrderId = toRentalOrderId(id);
    const actingUserId = this.userId;

    if (actingUserId === undefined || actingUserId.trim() === "") {
      throw new UnprocessableError({
        message: "User context is required to source rental order externally",
      });
    }

    const supplier = await this.supplierRepository.findById(
      data.supplierId as SupplierId,
    );

    if (supplier === null) {
      throw new NotFoundError({
        message: "Supplier not found",
        details: { supplierId: data.supplierId },
      });
    }

    return this.transactionRunner.run(
      async ({
        rentalOrderRepository,
        inventoryRepository,
        externalRentalRepository,
        auditLogger,
      }) => {
        const { authoritativeOrder } = await assertExternalSourcingF02Gate(
          {
            rentalOrderRepository,
            inventoryRepository,
            externalRentalRepository,
          },
          rentalOrderId,
          [
            {
              rentalOrderItemId: toRentalOrderItemId(data.rentalOrderItemId),
              quantityRequested: data.quantity,
            },
          ],
        );

        const authoritativeItem = authoritativeOrder.items.find(
          (line) => line.id === data.rentalOrderItemId,
        );

        if (authoritativeItem === undefined) {
          throw new UnprocessableError({
            message: "Rental order item does not belong to this rental order",
            details: {
              rentalOrderId: authoritativeOrder.id,
              rentalOrderItemId: data.rentalOrderItemId,
            },
          });
        }

        const agreementNumber = await resolveDocumentCode(
          this.numberSequences,
          "EXTERNAL_RENTAL_AGREEMENT",
          undefined,
        );

        const createData = toCreateExternalRentalAgreementData(
          {
            supplierId: data.supplierId,
            warehouseId: authoritativeOrder.warehouseId,
            rentalOrderId: authoritativeOrder.id,
            hireStartDate: authoritativeItem.startDate,
            hireEndDate: authoritativeItem.endDate,
            expectedReturnToSupplierDate: authoritativeItem.endDate,
            remarks: `Sourced externally from rental order ${authoritativeOrder.orderNumber} shortfall`,
            items: [
              {
                productId: authoritativeItem.productId,
                rentalOrderItemId: authoritativeItem.id,
                quantityRequested: data.quantity,
                unitCost: data.unitCost,
                notes: null,
              },
            ],
            agreementNumber,
          },
          toUserId(actingUserId),
        );

        return executeCreateExternalRentalInScope(
          { externalRentalRepository, auditLogger },
          createData,
        );
      },
    );
  }
}
