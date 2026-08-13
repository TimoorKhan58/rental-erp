import type { CreateExternalRentalService } from "@/modules/external-rental/application/services/create-external-rental.service";
import type { ExternalRentalAgreementDto } from "@/modules/external-rental/application/dtos/external-rental.dto";
import type { IExternalRentalRepository } from "@/modules/external-rental/domain";
import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import { calculateDateAwareAvailabilitySnapshot } from "@/modules/rental-order/domain/rental-order.availability.rules";
import type { IRentalOrderRepository } from "@/modules/rental-order/domain/rental-order.repository.interface";
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

/**
 * Phase 26 — operator "Source Externally" orchestration.
 *
 * Computes shortfall from canonical F-02 availability, then delegates ERA
 * creation to CreateExternalRentalService (no duplicated ERA business rules).
 * Never mutates owned inventory / F-02 capacity.
 */
export class SourceRentalOrderExternallyService {
  constructor(
    private readonly rentalOrderRepository: IRentalOrderRepository,
    private readonly inventoryRepository: IInventoryRepository,
    private readonly externalRentalRepository: IExternalRentalRepository,
    private readonly supplierRepository: ISupplierRepository,
    private readonly createExternalRental: CreateExternalRentalService,
  ) {}

  async execute(
    params: RentalOrderIdParamInput,
    input: SourceRentalOrderExternallyInput,
  ): Promise<ExternalRentalAgreementDto> {
    const { id } = parseRequest(RentalOrderIdParamSchema, params);
    const data = parseRequest(SourceRentalOrderExternallySchema, input);
    const rentalOrderId = toRentalOrderId(id);

    const order = await this.rentalOrderRepository.findById(rentalOrderId);

    if (order === null) {
      throw new NotFoundError({
        message: "Rental order not found",
        details: { id },
      });
    }

    if (order.status === "CANCELLED") {
      throw new UnprocessableError({
        message: "Cancelled rental order cannot be sourced externally",
        details: { rentalOrderId: order.id, status: order.status },
      });
    }

    if (!isSourceExternallyEligibleStatus(order.status)) {
      throw new UnprocessableError({
        message:
          "Rental order cannot be sourced externally in its current status",
        details: { rentalOrderId: order.id, status: order.status },
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

    const supplier = await this.supplierRepository.findById(
      data.supplierId as SupplierId,
    );

    if (supplier === null) {
      throw new NotFoundError({
        message: "Supplier not found",
        details: { supplierId: data.supplierId },
      });
    }

    const activeAgreement =
      await this.externalRentalRepository.findActiveByRentalOrderId(
        rentalOrderId,
      );

    if (activeAgreement !== null) {
      throw new ConflictError({
        message:
          "Active external rental agreement already exists for rental order",
        details: {
          rentalOrderId: order.id,
          activeExternalRentalAgreementId: activeAgreement.id,
        },
      });
    }

    const inventory = await this.inventoryRepository.findByProductAndWarehouse(
      item.productId,
      order.warehouseId,
    );

    const commitmentLines =
      await this.rentalOrderRepository.findAvailabilityCommitmentLines({
        productId: item.productId,
        warehouseId: order.warehouseId,
        excludeRentalOrderId: order.id,
      });

    const snapshot = calculateDateAwareAvailabilitySnapshot({
      quantityOnHand: inventory?.quantityOnHand ?? 0,
      reservedQuantity: inventory?.reservedQuantity ?? 0,
      requestedPeriod: {
        startDate: item.startDate,
        endDate: item.endDate,
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

    const shortfall = calculateExternalSourcingShortfall({
      requiredQuantity: item.quantity,
      dateAwareAvailableQuantity: snapshot.dateAwareAvailableQuantity,
      alreadyExternallyRequestedQuantity: 0,
    });

    if (shortfall.remainingShortfallQuantity <= 0) {
      throw new UnprocessableError({
        message: "No owned-inventory shortfall to source externally",
        details: {
          rentalOrderId: order.id,
          rentalOrderItemId: item.id,
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
          rentalOrderId: order.id,
          rentalOrderItemId: item.id,
          quantity: data.quantity,
          remainingShortfallQuantity: shortfall.remainingShortfallQuantity,
        },
      });
    }

    // Hire dates derive from the line's canonical rental period (BD-26.6).
    return this.createExternalRental.execute({
      supplierId: data.supplierId,
      warehouseId: order.warehouseId,
      rentalOrderId: order.id,
      hireStartDate: item.startDate,
      hireEndDate: item.endDate,
      expectedReturnToSupplierDate: item.endDate,
      remarks: `Sourced externally from rental order ${order.orderNumber} shortfall`,
      items: [
        {
          productId: item.productId,
          rentalOrderItemId: item.id,
          quantityRequested: data.quantity,
          unitCost: data.unitCost,
          notes: null,
        },
      ],
    });
  }
}
