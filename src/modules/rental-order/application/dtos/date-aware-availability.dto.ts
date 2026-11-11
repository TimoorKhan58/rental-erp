import type { ProductId, WarehouseId } from "@/shared/domain/ids";

export type DateAwareAvailabilityDto = {
  productId: string;
  warehouseId: string;
  startDate: string;
  endDate: string;
  quantityOnHand: number;
  reservedQuantity: number;
  currentAvailableQuantity: number;
  outstandingOutQuantity: number;
  baseCapacity: number;
  dateAwareCommittedQuantity: number;
  dateAwareAvailableQuantity: number;
  /** Reservable now for these dates; see bookableQuantity in availability rules (QA-009). */
  bookableQuantity: number;
  heldForOtherDatesQuantity: number;
};

export type GetDateAwareAvailabilityParams = {
  productId: ProductId | string;
  warehouseId: WarehouseId | string;
  startDate: Date | string;
  endDate: Date | string;
};
