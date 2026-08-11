import { parseRequest } from "@/shared/application/validation";
import type {
  ProductId,
  RentalOrderId,
  WarehouseId,
} from "@/shared/domain/ids";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import { calculateDateAwareAvailabilitySnapshot } from "@/modules/rental-order/domain/rental-order.availability.rules";
import type { IRentalOrderRepository } from "@/modules/rental-order/domain/rental-order.repository.interface";

import type { DateAwareAvailabilityDto } from "../dtos/date-aware-availability.dto";
import {
  GetDateAwareAvailabilitySchema,
  type GetDateAwareAvailabilityParams,
} from "../schemas/date-aware-availability.schema";

/**
 * F-02 read-only date-aware availability.
 * Does not mutate inventory, rental orders, dispatches, or returns.
 */
export class GetDateAwareAvailabilityService {
  constructor(
    private readonly rentalOrderRepository: IRentalOrderRepository,
    private readonly inventoryRepository: IInventoryRepository,
  ) {}

  async execute(
    input: GetDateAwareAvailabilityParams,
  ): Promise<DateAwareAvailabilityDto> {
    const parsed = parseRequest(GetDateAwareAvailabilitySchema, input);
    const productId = parsed.productId as ProductId;
    const warehouseId = parsed.warehouseId as WarehouseId;
    const excludeRentalOrderId =
      parsed.excludeRentalOrderId !== undefined
        ? (parsed.excludeRentalOrderId as RentalOrderId)
        : undefined;

    const [inventory, commitmentLines] = await Promise.all([
      this.inventoryRepository.findByProductAndWarehouse(
        productId,
        warehouseId,
      ),
      this.rentalOrderRepository.findAvailabilityCommitmentLines({
        productId,
        warehouseId,
        excludeRentalOrderId,
      }),
    ]);

    if (inventory === null) {
      throw new NotFoundError({
        message: "Inventory not found for product and warehouse",
        details: { productId, warehouseId },
      });
    }

    const snapshot = calculateDateAwareAvailabilitySnapshot({
      quantityOnHand: inventory.quantityOnHand,
      reservedQuantity: inventory.reservedQuantity,
      requestedPeriod: {
        startDate: parsed.startDate,
        endDate: parsed.endDate,
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

    return {
      productId,
      warehouseId,
      startDate: parsed.startDate.toISOString(),
      endDate: parsed.endDate.toISOString(),
      quantityOnHand: snapshot.quantityOnHand,
      reservedQuantity: snapshot.reservedQuantity,
      currentAvailableQuantity: snapshot.currentAvailableQuantity,
      outstandingOutQuantity: snapshot.outstandingOutQuantity,
      baseCapacity: snapshot.baseCapacity,
      dateAwareCommittedQuantity: snapshot.dateAwareCommittedQuantity,
      dateAwareAvailableQuantity: snapshot.dateAwareAvailableQuantity,
    };
  }
}
