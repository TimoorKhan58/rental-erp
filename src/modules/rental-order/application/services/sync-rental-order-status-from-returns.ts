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

  const dispatches = await deps.dispatchRepository.findPaged({
    page: 1,
    pageSize: 100,
    rentalOrderId,
    sortOrder: "desc",
  });

  const completedDispatches = dispatches.items.filter(
    (dispatch) => dispatch.status === "COMPLETED",
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
  const completedDispatchIds = completedDispatches.map((dispatch) => dispatch.id);
  const returns = await deps.returnRepository.findByDispatchIds(completedDispatchIds);
  const returnsByDispatchId = new Map<string, typeof returns>();

  for (const returnRecord of returns) {
    const dispatchReturns = returnsByDispatchId.get(returnRecord.dispatchId);
    if (dispatchReturns) {
      dispatchReturns.push(returnRecord);
      continue;
    }
    returnsByDispatchId.set(returnRecord.dispatchId, [returnRecord]);
  }

  for (const dispatch of completedDispatches) {
    const dispatchReturns = returnsByDispatchId.get(dispatch.id) ?? [];

    for (const returnRecord of dispatchReturns) {
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
    await deps.rentalOrderRepository.updateStatus(rentalOrderId, nextStatus);
  }

  return nextStatus;
}
