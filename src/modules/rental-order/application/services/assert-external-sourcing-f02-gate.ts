import type { IExternalRentalRepository } from "@/modules/external-rental/domain";
import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import { calculateDateAwareAvailabilitySnapshot } from "@/modules/rental-order/domain/rental-order.availability.rules";
import type { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import type { IRentalOrderRepository } from "@/modules/rental-order/domain/rental-order.repository.interface";
import {
  calculateExternalSourcingShortfall,
  isSourceExternallyEligibleStatus,
} from "@/modules/rental-order/domain/rental-order.shortfall.rules";
import type {
  InventoryId,
  ProductId,
  RentalOrderId,
  RentalOrderItemId,
  WarehouseId,
} from "@/shared/domain/ids";
import {
  ConflictError,
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

export type ExternalSourcingF02GateItem = {
  rentalOrderItemId: RentalOrderItemId;
  quantityRequested: number;
  /** When provided (direct create), must match the rental order line product. */
  productId?: ProductId;
};

export type ExternalSourcingF02GateScope = {
  readonly rentalOrderRepository: IRentalOrderRepository;
  readonly inventoryRepository: IInventoryRepository;
  readonly externalRentalRepository: IExternalRentalRepository;
};

export type ExternalSourcingF02GateOptions = {
  /** Reject when the rental order warehouse differs (direct create input parity). */
  expectedWarehouseId?: WarehouseId;
};

export type ExternalSourcingF02GateResult = {
  authoritativeOrder: RentalOrder;
};

function aggregateGateItems(
  items: ExternalSourcingF02GateItem[],
): Map<RentalOrderItemId, { quantityRequested: number; productId?: ProductId }> {
  const aggregated = new Map<
    RentalOrderItemId,
    { quantityRequested: number; productId?: ProductId }
  >();

  for (const item of items) {
    const existing = aggregated.get(item.rentalOrderItemId);

    if (existing === undefined) {
      aggregated.set(item.rentalOrderItemId, {
        quantityRequested: item.quantityRequested,
        productId: item.productId,
      });
      continue;
    }

    if (
      item.productId !== undefined &&
      existing.productId !== undefined &&
      item.productId !== existing.productId
    ) {
      throw new UnprocessableError({
        message: "Conflicting product ids for the same rental order item",
        details: { rentalOrderItemId: item.rentalOrderItemId },
      });
    }

    aggregated.set(item.rentalOrderItemId, {
      quantityRequested: existing.quantityRequested + item.quantityRequested,
      productId: item.productId ?? existing.productId,
    });
  }

  return aggregated;
}

/**
 * Phase 48 / Phase 53 (DL-51-03) — shared F-02 shortfall gate for all ERA creation paths.
 * Caller must invoke within an open UoW; acquires inventory + RO locks before validation.
 */
export async function assertExternalSourcingF02Gate(
  scope: ExternalSourcingF02GateScope,
  rentalOrderId: RentalOrderId,
  items: ExternalSourcingF02GateItem[],
  options: ExternalSourcingF02GateOptions = {},
): Promise<ExternalSourcingF02GateResult> {
  if (items.length === 0) {
    throw new UnprocessableError({
      message: "At least one rental order item is required for external sourcing",
    });
  }

  const aggregatedItems = aggregateGateItems(items);

  const order = await scope.rentalOrderRepository.findById(rentalOrderId);

  if (order === null) {
    throw new NotFoundError({
      message: "Rental order not found",
      details: { rentalOrderId },
    });
  }

  if (
    options.expectedWarehouseId !== undefined &&
    order.warehouseId !== options.expectedWarehouseId
  ) {
    throw new UnprocessableError({
      message: "Warehouse does not match rental order warehouse",
      details: {
        rentalOrderId: order.id,
        warehouseId: options.expectedWarehouseId,
        rentalOrderWarehouseId: order.warehouseId,
      },
    });
  }

  const inventoryIdsToLock = new Set<InventoryId>();

  for (const [rentalOrderItemId, gateItem] of aggregatedItems) {
    const line = order.items.find((item) => item.id === rentalOrderItemId);

    if (line === undefined) {
      throw new UnprocessableError({
        message: "Rental order item does not belong to this rental order",
        details: {
          rentalOrderId: order.id,
          rentalOrderItemId,
        },
      });
    }

    if (
      gateItem.productId !== undefined &&
      gateItem.productId !== line.productId
    ) {
      throw new UnprocessableError({
        message: "Product does not match rental order item",
        details: {
          rentalOrderId: order.id,
          rentalOrderItemId,
          productId: gateItem.productId,
          rentalOrderItemProductId: line.productId,
        },
      });
    }

    const inventory = await scope.inventoryRepository.findByProductAndWarehouse(
      line.productId,
      order.warehouseId,
    );

    if (inventory !== null) {
      inventoryIdsToLock.add(inventory.id);
    }
  }

  const sortedInventoryIds = Array.from(inventoryIdsToLock).sort((left, right) =>
    left.localeCompare(right),
  );

  for (const inventoryId of sortedInventoryIds) {
    await scope.inventoryRepository.lockForAvailabilityCommit(inventoryId);
  }

  await scope.rentalOrderRepository.lockForReserveCommand(rentalOrderId);

  const authoritativeOrder =
    await scope.rentalOrderRepository.findById(rentalOrderId);

  if (authoritativeOrder === null) {
    throw new NotFoundError({
      message: "Rental order not found",
      details: { rentalOrderId },
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

  const activeAgreement =
    await scope.externalRentalRepository.findActiveByRentalOrderId(
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

  for (const [rentalOrderItemId, gateItem] of aggregatedItems) {
    const authoritativeItem = authoritativeOrder.items.find(
      (line) => line.id === rentalOrderItemId,
    );

    if (authoritativeItem === undefined) {
      throw new UnprocessableError({
        message: "Rental order item does not belong to this rental order",
        details: {
          rentalOrderId: authoritativeOrder.id,
          rentalOrderItemId,
        },
      });
    }

    const authoritativeInventory =
      await scope.inventoryRepository.findByProductAndWarehouse(
        authoritativeItem.productId,
        authoritativeOrder.warehouseId,
      );

    const commitmentLines =
      await scope.rentalOrderRepository.findAvailabilityCommitmentLines({
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

    // Active ERA uniqueness is enforced above; no concurrent active agreement
    // can contribute additional requested quantity in this gate path.
    const alreadyExternallyRequestedQuantity = 0;

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

    if (gateItem.quantityRequested > shortfall.remainingShortfallQuantity) {
      throw new UnprocessableError({
        message: "External quantity exceeds remaining shortfall",
        details: {
          rentalOrderId: authoritativeOrder.id,
          rentalOrderItemId: authoritativeItem.id,
          quantity: gateItem.quantityRequested,
          remainingShortfallQuantity: shortfall.remainingShortfallQuantity,
        },
      });
    }
  }

  return { authoritativeOrder };
}
