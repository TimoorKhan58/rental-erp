import type { IDispatchRepository } from "@/modules/dispatch/domain/dispatch.repository.interface";
import type { IReturnRepository } from "@/modules/return/domain";
import type { RentalOrderStatus } from "@/modules/rental-order/domain/rental-order.constants";
import type { IRentalOrderRepository } from "@/modules/rental-order/domain/rental-order.repository.interface";
import type { RentalOrderId } from "@/shared/domain/ids";

interface SyncRentalOrderStatusDeps {
  dispatchRepository: IDispatchRepository;
  returnRepository: IReturnRepository;
  rentalOrderRepository: IRentalOrderRepository;
}

export async function syncRentalOrderStatusFromReturns(
  rentalOrderId: RentalOrderId,
  deps: SyncRentalOrderStatusDeps,
): Promise<RentalOrderStatus | null> {
  const rentalOrder = await deps.rentalOrderRepository.findById(rentalOrderId);

  if (
    rentalOrder === null ||
    rentalOrder.status === "COMPLETED" ||
    rentalOrder.status === "CANCELLED"
  ) {
    return null;
  }

  const completedDispatches =
    await deps.dispatchRepository.findCompletedDispatchesByRentalOrderId(
      rentalOrderId,
    );

  if (completedDispatches.length === 0) {
    return null;
  }

  const dispatchedByItem = new Map<string, number>();

  for (const dispatch of completedDispatches) {
    for (const item of dispatch.items) {
      if (item.rentalOrderItemId === null) {
        continue;
      }

      const current = dispatchedByItem.get(item.rentalOrderItemId) ?? 0;
      dispatchedByItem.set(item.rentalOrderItemId, current + item.quantity);
    }
  }

  const returnedByItem = new Map<string, number>();
  let hasAnyReturn = false;
  let allReturnsCompleted = true;

  for (const dispatch of completedDispatches) {
    const returns = await deps.returnRepository.findByDispatchId(dispatch.id);

    for (const returnRecord of returns) {
      if (returnRecord.status === "CANCELLED") {
        continue;
      }

      hasAnyReturn = true;

      if (returnRecord.status !== "COMPLETED") {
        allReturnsCompleted = false;
      }

      if (returnRecord.status === "COMPLETED") {
        for (const item of returnRecord.items) {
          const current = returnedByItem.get(item.rentalOrderItemId) ?? 0;
          returnedByItem.set(
            item.rentalOrderItemId,
            current + item.returnedQuantity,
          );
        }
      }
    }
  }

  if (!hasAnyReturn) {
    return null;
  }

  const fullyReturned = Array.from(dispatchedByItem.entries()).every(
    ([itemId, dispatchedQty]) => (returnedByItem.get(itemId) ?? 0) >= dispatchedQty,
  );

  let nextStatus: RentalOrderStatus;

  if (fullyReturned && allReturnsCompleted) {
    nextStatus = "COMPLETED";
  } else {
    const hasPartialReturn = Array.from(dispatchedByItem.entries()).some(
      ([itemId, dispatchedQty]) => {
        const returnedQty = returnedByItem.get(itemId) ?? 0;
        return returnedQty > 0 && returnedQty < dispatchedQty;
      },
    );

    nextStatus = hasPartialReturn ? "PARTIALLY_RETURNED" : "RETURNED";
  }

  if (rentalOrder.status !== nextStatus) {
    // Phase 29 (F-08): sync writer uses atomic expected-status claim so
    // concurrent return completions on different returns of the same RO
    // cannot race and overwrite each other with a stale target status.
    // A null result means another concurrent sync already advanced the RO;
    // the next return-completion will re-run this reconciliation.
    const claimed = await deps.rentalOrderRepository.claimStatusTransition(
      rentalOrderId,
      rentalOrder.status,
      nextStatus,
    );

    if (claimed === null) {
      return null;
    }
  }

  return nextStatus;
}
