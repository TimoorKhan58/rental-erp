import { executeCreateExternalRentalInScope } from "@/modules/external-rental/application/services/create-external-rental-in-scope";
import type { ExternalRentalAgreementDto } from "@/modules/external-rental/application/dtos/external-rental.dto";
import { toCreateExternalRentalAgreementData, toUserId } from "@/modules/external-rental/application/mappers/external-rental.mapper";
import { resolveDocumentCode } from "@/modules/settings/application/services/resolve-document-code";
import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";
import { calculateDateAwareAvailabilitySnapshot } from "@/modules/rental-order/domain/rental-order.availability.rules";
import {
  calculateExternalSourcingShortfall,
  isSourceExternallyEligibleStatus,
} from "@/modules/rental-order/domain/rental-order.shortfall.rules";
import type { ISupplierRepository } from "@/modules/supplier/domain/supplier.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import type { SupplierId } from "@/shared/domain/ids";
import {
  ConflictError,
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
import type { IRentalOrderTransactionRunner } from "./rental-order-transaction.runner";

/**
 * Phase 26 — operator "Source Externally" orchestration.
 * Phase 48 (N-46-02) — F-02 shortfall validated under inventory + RO locks
 * in the same UoW as ERA creation.
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

    if (this.userId === undefined || this.userId.trim() === "") {
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
        userId,
      }) => {
        const order = await rentalOrderRepository.findById(rentalOrderId);

        if (order === null) {
          throw new NotFoundError({
            message: "Rental order not found",
            details: { id },
          });
        }

        const item = order.items.find(
          (line) => line.id === data.rentalOrderItemId,
        );

        if (item === undefined) {
          throw new UnprocessableError({
            message: "Rental order item does not belong to this rental order",
            details: {
              rentalOrderId: order.id,
              rentalOrderItemId: data.rentalOrderItemId,
            },
          });
        }

        const inventory = await inventoryRepository.findByProductAndWarehouse(
          item.productId,
          order.warehouseId,
        );

        if (inventory !== null) {
          await inventoryRepository.lockForAvailabilityCommit(inventory.id);
        }

        await rentalOrderRepository.lockForReserveCommand(rentalOrderId);

        const authoritativeOrder =
          await rentalOrderRepository.findById(rentalOrderId);

        if (authoritativeOrder === null) {
          throw new NotFoundError({
            message: "Rental order not found",
            details: { id },
          });
        }

        if (authoritativeOrder.status === "CANCELLED") {
          throw new UnprocessableError({
            message: "Cancelled rental order cannot be sourced externally",
            details: {
              rentalOrderId: authoritativeOrder.id,
              status: authoritativeOrder.status,
            },
          });
        }

        if (!isSourceExternallyEligibleStatus(authoritativeOrder.status)) {
          throw new UnprocessableError({
            message:
              "Rental order cannot be sourced externally in its current status",
            details: {
              rentalOrderId: authoritativeOrder.id,
              status: authoritativeOrder.status,
            },
          });
        }

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

        const activeAgreement =
          await externalRentalRepository.findActiveByRentalOrderId(
            rentalOrderId,
          );

        if (activeAgreement !== null) {
          throw new ConflictError({
            message:
              "Active external rental agreement already exists for rental order",
            details: {
              rentalOrderId: authoritativeOrder.id,
              activeExternalRentalAgreementId: activeAgreement.id,
            },
          });
        }

        const authoritativeInventory =
          inventory === null
            ? null
            : await inventoryRepository.findById(inventory.id);

        const commitmentLines =
          await rentalOrderRepository.findAvailabilityCommitmentLines({
            productId: authoritativeItem.productId,
            warehouseId: authoritativeOrder.warehouseId,
            excludeRentalOrderId: authoritativeOrder.id,
          });

        const snapshot = calculateDateAwareAvailabilitySnapshot({
          quantityOnHand: authoritativeInventory?.quantityOnHand ?? 0,
          reservedQuantity: authoritativeInventory?.reservedQuantity ?? 0,
          requestedPeriod: {
            startDate: authoritativeItem.startDate,
            endDate: authoritativeItem.endDate,
          },
          lines: commitmentLines.map((line) => ({
            status: line.status,
            eventStartDate: line.eventStartDate,
            eventEndDate: line.eventEndDate,
            reservedQuantity: line.reservedQuantity,
            dispatches: line.dispatches,
            returns: line.returns,
          })),
        });

        const alreadyExternallyRequestedQuantity =
          activeAgreement?.items
            .filter(
              (eraItem) => eraItem.rentalOrderItemId === authoritativeItem.id,
            )
            .reduce((sum, eraItem) => sum + eraItem.quantityRequested, 0) ?? 0;

        const shortfall = calculateExternalSourcingShortfall({
          requiredQuantity: authoritativeItem.quantity,
          dateAwareAvailableQuantity: snapshot.dateAwareAvailableQuantity,
          alreadyExternallyRequestedQuantity,
        });

        if (shortfall.remainingShortfallQuantity <= 0) {
          throw new UnprocessableError({
            message: "No owned-inventory shortfall to source externally",
            details: {
              rentalOrderId: authoritativeOrder.id,
              rentalOrderItemId: authoritativeItem.id,
              requiredQuantity: shortfall.requiredQuantity,
              ownedFulfillableQuantity: shortfall.ownedFulfillableQuantity,
              shortfallQuantity: shortfall.shortfallQuantity,
            },
          });
        }

        if (data.quantity > shortfall.remainingShortfallQuantity) {
          throw new UnprocessableError({
            message: "External quantity exceeds remaining shortfall",
            details: {
              rentalOrderId: authoritativeOrder.id,
              rentalOrderItemId: authoritativeItem.id,
              quantity: data.quantity,
              remainingShortfallQuantity: shortfall.remainingShortfallQuantity,
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
          toUserId(userId ?? this.userId),
        );

        return executeCreateExternalRentalInScope(
          { externalRentalRepository, auditLogger },
          createData,
        );
      },
    );
  }
}
