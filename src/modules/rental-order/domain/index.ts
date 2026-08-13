export {
  RENTAL_ORDER_ENTITY_NAME,
  RENTAL_ORDER_MODULE,
  RENTAL_ORDER_REFERENCE_TYPE,
  RENTAL_ORDER_SEARCH_FIELDS,
  RENTAL_ORDER_SORT_FIELDS,
  RENTAL_ORDER_STATUSES,
  type RentalOrderSortField,
  type RentalOrderStatus,
} from "./rental-order.constants";
export { RentalOrder } from "./rental-order.entity";
export {
  RentalOrderDomainError,
  RentalOrderInvalidReserveError,
  RentalOrderInvalidStatusError,
  RentalOrderInvariantError,
  createOrderNumber,
} from "./rental-order.errors";
export type { RentalOrderListQuery } from "./rental-order-list.query";
export type { IRentalOrderRepository } from "./rental-order.repository.interface";
export {
  AVAILABILITY_COMMITMENT_STATUSES,
  availabilityPeriodsOverlap,
  assertValidAvailabilityPeriod,
  calculateCommitmentQuantity,
  calculateDateAwareAvailabilitySnapshot,
  isAvailabilityCommitmentStatus,
  sumCompletedDispatchQuantities,
  sumCompletedReturnQuantities,
  sumNonCancelledDispatchClaims,
  toUtcCalendarDay,
  type AvailabilityCommitmentLine,
  type AvailabilityDispatchClaim,
  type AvailabilityPeriod,
  type AvailabilityReturnClaim,
  type CommitmentQuantityBreakdown,
  type CommitmentQuantityInput,
  type DateAwareAvailabilitySnapshot,
  type DateAwareAvailabilitySnapshotInput,
} from "./rental-order.availability.rules";
export {
  SOURCE_EXTERNALLY_ELIGIBLE_STATUSES,
  calculateExternalSourcingShortfall,
  isSourceExternallyEligibleStatus,
  type ExternalSourcingShortfallInput,
  type ExternalSourcingShortfallResult,
  type SourceExternallyEligibleStatus,
} from "./rental-order.shortfall.rules";
export type {
  AvailabilityCommitmentLineProjection,
  FindAvailabilityCommitmentLinesParams,
} from "./rental-order.availability.projection";
export {
  applyReserveToItems,
  assertCanCancel,
  assertCanConfirm,
  assertCanMarkDispatched,
  assertCanMarkOnRent,
  assertCanReserve,
  assertCanUpdate,
  CANCELLABLE_RENTAL_ORDER_STATUSES,
  clearReservedQuantitiesOnCancel,
  computeLineTotal,
  computeRentalDays,
  computeStatusAfterReserve,
  DISPATCHABLE_RENTAL_ORDER_STATUSES,
  validateRentalOrderItems,
  validateRentalPeriod,
} from "./rental-order.rules";
export type {
  CreateRentalOrderData,
  CreateRentalOrderItemData,
  RentalOrderItemProps,
  RentalOrderProps,
  ReserveRentalOrderItemData,
  UpdateRentalOrderData,
  UpdateRentalOrderReserveData,
} from "./rental-order.types";
