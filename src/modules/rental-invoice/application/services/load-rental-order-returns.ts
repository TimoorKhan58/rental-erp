import type { IDispatchRepository } from "@/modules/dispatch/domain/dispatch.repository.interface";
import type { Return } from "@/modules/return/domain/return.entity";
import type { IReturnRepository } from "@/modules/return/domain/return.repository.interface";
import type { RentalOrderId } from "@/shared/domain/ids";

/**
 * Loads all return records for a rental order without pagination caps.
 * Uses completed dispatches only — invoice generation requires a COMPLETED order.
 */
export async function loadReturnsForRentalOrder(
  rentalOrderId: RentalOrderId,
  dispatchRepository: IDispatchRepository,
  returnRepository: IReturnRepository,
): Promise<Return[]> {
  const dispatches =
    await dispatchRepository.findCompletedDispatchesByRentalOrderId(rentalOrderId);

  return (
    await Promise.all(
      dispatches.map((dispatch) => returnRepository.findByDispatchId(dispatch.id)),
    )
  ).flat();
}
