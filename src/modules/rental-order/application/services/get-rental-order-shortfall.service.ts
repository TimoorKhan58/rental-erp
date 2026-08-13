import type { IExternalRentalRepository } from "@/modules/external-rental/domain";
import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import { calculateDateAwareAvailabilitySnapshot } from "@/modules/rental-order/domain/rental-order.availability.rules";
import type { IRentalOrderRepository } from "@/modules/rental-order/domain/rental-order.repository.interface";
import {
  calculateExternalSourcingShortfall,
  isSourceExternallyEligibleStatus,
} from "@/modules/rental-order/domain/rental-order.shortfall.rules";
import { parseRequest } from "@/shared/application/validation";
import type { RentalOrderId } from "@/shared/domain/ids";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { RentalOrderShortfallDto } from "../dtos/rental-order-shortfall.dto";
import { toRentalOrderId } from "../mappers/rental-order.mapper";
import {
  RentalOrderIdParamSchema,
  type RentalOrderIdParamInput,
} from "../schemas/rental-order.schemas";

/**
 * Phase 26 — read model for owned shortfall vs F-02 date-aware availability.
 * Informational only; does not mutate inventory, F-02, or ERA state.
 */
export class GetRentalOrderShortfallService {
  constructor(
    private readonly rentalOrderRepository: IRentalOrderRepository,
    private readonly inventoryRepository: IInventoryRepository,
    private readonly externalRentalRepository: IExternalRentalRepository,
  ) {}

  async execute(
    params: RentalOrderIdParamInput,
  ): Promise<RentalOrderShortfallDto> {
    const { id } = parseRequest(RentalOrderIdParamSchema, params);
    const rentalOrderId = toRentalOrderId(id);

    const order = await this.rentalOrderRepository.findById(rentalOrderId);

    if (order === null) {
      throw new NotFoundError({
        message: "Rental order not found",
        details: { id },
      });
    }

    const activeAgreement =
      await this.externalRentalRepository.findActiveByRentalOrderId(
        rentalOrderId as RentalOrderId,
      );

    const statusEligible = isSourceExternallyEligibleStatus(order.status);
    const hasActiveExternalRentalAgreement = activeAgreement !== null;

    const items = await Promise.all(
      order.items.map(async (item) => {
        const inventory =
          await this.inventoryRepository.findByProductAndWarehouse(
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

        const alreadyExternallyRequestedQuantity =
          activeAgreement?.items
            .filter((eraItem) => eraItem.rentalOrderItemId === item.id)
            .reduce((sum, eraItem) => sum + eraItem.quantityRequested, 0) ?? 0;

        const shortfall = calculateExternalSourcingShortfall({
          requiredQuantity: item.quantity,
          dateAwareAvailableQuantity: snapshot.dateAwareAvailableQuantity,
          alreadyExternallyRequestedQuantity,
        });

        const canSourceExternally =
          statusEligible &&
          !hasActiveExternalRentalAgreement &&
          shortfall.remainingShortfallQuantity > 0;

        return {
          rentalOrderItemId: item.id,
          productId: item.productId,
          requiredQuantity: shortfall.requiredQuantity,
          ownedFulfillableQuantity: shortfall.ownedFulfillableQuantity,
          dateAwareAvailableQuantity: snapshot.dateAwareAvailableQuantity,
          shortfallQuantity: shortfall.shortfallQuantity,
          alreadyExternallyRequestedQuantity:
            shortfall.alreadyExternallyRequestedQuantity,
          remainingShortfallQuantity: shortfall.remainingShortfallQuantity,
          canSourceExternally,
          hireStartDate: item.startDate.toISOString(),
          hireEndDate: item.endDate.toISOString(),
        };
      }),
    );

    return {
      rentalOrderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      warehouseId: order.warehouseId,
      startDate: order.startDate.toISOString(),
      endDate: order.endDate.toISOString(),
      activeExternalRentalAgreementId: activeAgreement?.id ?? null,
      hasActiveExternalRentalAgreement,
      canSourceExternally: items.some((item) => item.canSourceExternally),
      items,
    };
  }
}
