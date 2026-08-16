import type { RentalOrderId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type {
  AvailabilityCommitmentLineProjection,
  FindAvailabilityCommitmentLinesParams,
} from "./rental-order.availability.projection";
import type { RentalOrder } from "./rental-order.entity";
import type { RentalOrderListQuery } from "./rental-order-list.query";
import type {
  CreateRentalOrderData,
  UpdateRentalOrderData,
  UpdateRentalOrderReserveData,
} from "./rental-order.types";

export interface IRentalOrderRepository {
  findById(id: RentalOrderId): Promise<RentalOrder | null>;
  findByOrderNumber(orderNumber: string): Promise<RentalOrder | null>;
  findPaged(query: RentalOrderListQuery): Promise<PaginatedResult<RentalOrder>>;
  /**
   * F-02 read projection: all availability-commitment rental lines for
   * product × warehouse (RESERVED | ON_RENT | PARTIALLY_RETURNED).
   *
   * Unbounded — must not apply list pageSize caps.
   * Includes nested dispatch/return claim fields required by domain commitment math.
   */
  findAvailabilityCommitmentLines(
    params: FindAvailabilityCommitmentLinesParams,
  ): Promise<AvailabilityCommitmentLineProjection[]>;
  create(data: CreateRentalOrderData): Promise<RentalOrder>;
  update(id: RentalOrderId, data: UpdateRentalOrderData): Promise<RentalOrder>;
  updateReserve(
    id: RentalOrderId,
    data: UpdateRentalOrderReserveData,
  ): Promise<RentalOrder | null>;
  /**
   * Conditionally claims CANCELLED when status is DRAFT | CONFIRMED | RESERVED.
   * Does not clear item reservedQuantity — caller releases inventory first,
   * then clears lines. Returns null when zero rows match.
   */
  cancelIfCancellable(id: RentalOrderId): Promise<RentalOrder | null>;
  /**
   * Sets every order-line reservedQuantity to 0 without changing status.
   */
  clearReservedQuantities(id: RentalOrderId): Promise<RentalOrder>;
  updateStatus(
    id: RentalOrderId,
    status: RentalOrder["status"],
  ): Promise<RentalOrder>;
  /**
   * Phase 29 (F-08): atomically claims a status transition using an
   * expected-status predicate. Returns the updated rental order on success,
   * or null when zero rows match (concurrent update lost the race, or the
   * expected precondition no longer holds).
   *
   * Callers should translate a null result into ConcurrentUpdateError
   * (mapped to HTTP 409) and refetch domain state.
   */
  claimStatusTransition(
    id: RentalOrderId,
    expected: RentalOrder["status"] | ReadonlyArray<RentalOrder["status"]>,
    next: RentalOrder["status"],
  ): Promise<RentalOrder | null>;
  /**
   * Phase 30 (F-05): serializes dispatch create/update capacity checks for one
   * rental order. Must run inside the existing UoW before Rollup A is read.
   */
  lockForDispatchClaim(id: RentalOrderId): Promise<void>;
}
