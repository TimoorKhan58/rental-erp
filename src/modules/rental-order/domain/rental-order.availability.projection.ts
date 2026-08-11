import type {
  ProductId,
  RentalOrderId,
  WarehouseId,
} from "@/shared/domain/ids";

import type {
  AvailabilityDispatchClaim,
  AvailabilityReturnClaim,
} from "./rental-order.availability.rules";
import type { RentalOrderStatus } from "./rental-order.constants";

/**
 * Persistence projection for F-02 commitment lines (product × warehouse).
 * Loaded without pagination — must not silently truncate.
 */
export type AvailabilityCommitmentLineProjection = {
  rentalOrderItemId: string;
  rentalOrderId: string;
  productId: ProductId;
  warehouseId: WarehouseId;
  status: RentalOrderStatus;
  reservedQuantity: number;
  eventStartDate: Date;
  eventEndDate: Date;
  dispatches: AvailabilityDispatchClaim[];
  returns: AvailabilityReturnClaim[];
};

export type FindAvailabilityCommitmentLinesParams = {
  productId: ProductId;
  warehouseId: WarehouseId;
  /** Omit this order's lines from competing commitments (reserve self-exclusion). */
  excludeRentalOrderId?: RentalOrderId;
};
