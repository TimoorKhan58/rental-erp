import type {
  ExternalRentalAgreementId,
  RentalOrderId,
} from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type {
  ExternalRentalAgreementStatus,
  ExternalRentalSettlementStatus,
} from "./external-rental.constants";
import type { ExternalRentalAgreement } from "./external-rental.entity";
import type { ExternalRentalListQuery } from "./external-rental-list.query";
import type {
  CreateExternalRentalAgreementData,
  UpdateExternalRentalWorkflowData,
} from "./external-rental.types";

/**
 * Phase 29 (F-02): per-item delta payload for atomic workflow updates.
 * All *Delta fields are additive integers (>= 0 for cumulative counters).
 * quantityConfirmedAbsolute is used only for the once-only Confirm path.
 * lineHireInCostDelta is the money increment (may be 0 when no receive delta).
 */
export interface ExternalRentalWorkflowItemDelta {
  itemId: string;
  quantityConfirmedAbsolute?: number;
  quantityReceivedDelta?: number;
  quantityAllocatedDelta?: number;
  quantityDispatchedDelta?: number;
  quantityReturnedFromCustomerDelta?: number;
  quantityReturnedToSupplierDelta?: number;
  quantityWrittenOffDelta?: number;
  lineHireInCostDelta?: number;
}

/**
 * Phase 29 (F-02): identifies which per-item invariant the atomic
 * counter increment must enforce inside the database predicate:
 * - 'confirm': set quantityConfirmed absolute (guarded by DRAFT claim)
 * - 'receive': quantityReceived + delta <= quantityConfirmed
 * - 'allocate': quantityAllocated + delta <= quantityReceived
 * - 'dispatch': quantityDispatched + delta <= quantityAllocated
 * - 'customer-return': quantityReturnedFromCustomer + delta <= quantityDispatched
 * - 'supplier-return': quantityReturnedToSupplier + delta <= (received - writtenOff - returnedToSupplier)
 *   after subtracting already-in-custody (dispatched - returnedFromCustomer);
 *   simplified: quantityReturnedToSupplier + delta <=
 *     quantityReceived - quantityWrittenOff -
 *     max(quantityDispatched - quantityReturnedFromCustomer, 0)
 * - 'write-off': mirror of supplier-return, applied to quantityWrittenOff
 * - 'cancel': no per-item mutation (money reset on parent)
 */
export type ExternalRentalWorkflowKind =
  | "confirm"
  | "receive"
  | "allocate"
  | "dispatch"
  | "customer-return"
  | "supplier-return"
  | "write-off";

/**
 * Phase 29 (F-02): atomic workflow-update payload. The parent status
 * transitions from any of `expectedStatuses` to `nextStatus` in a single
 * `updateMany` predicated on the current status. Per-item counters mutate
 * via Prisma atomic { increment } operators. Derived money fields
 * (totalHireInCost, amountDue) and settlementStatus are recomputed from
 * the post-increment item state inside the same transaction.
 */
export interface ApplyExternalRentalWorkflowDeltaData {
  /**
   * Phase 29 (F-02): identifies the specific per-item DB predicate to apply
   * so counter increments cannot violate the domain invariant under
   * concurrency (e.g. quantityReceived + delta <= quantityConfirmed).
   */
  workflowKind: ExternalRentalWorkflowKind;
  expectedStatuses: ReadonlyArray<ExternalRentalAgreementStatus>;
  nextStatus: ExternalRentalAgreementStatus;
  items: ReadonlyArray<ExternalRentalWorkflowItemDelta>;
  /**
   * When set, totalHireInCost / amountDue / settlementStatus are written
   * with these absolute values (used by Confirm which sets provisional
   * amountDue from quantityConfirmed × unitCost — not yet reflected in
   * item.lineHireInCost). Applied atomically inside the claim tx.
   */
  moneyOverride?: {
    totalHireInCost: number;
    amountDue: number;
    settlementStatus: ExternalRentalSettlementStatus;
  };
  /**
   * When true, totalHireInCost / amountDue are recomputed from
   * SUM(item.lineHireInCost) after item increments, and settlementStatus
   * is re-derived from the fresh (amountDue, current amountPaid) pair.
   * Set false for pure counter transitions that do not touch money
   * (e.g. Allocate, Dispatch, CustomerReturn, SupplierReturn, WriteOff).
   * Ignored when `moneyOverride` is set.
   */
  recomputeMoney: boolean;
}

/**
 * Persistence port for external rental agreements.
 */
export interface IExternalRentalRepository {
  findById(
    id: ExternalRentalAgreementId,
  ): Promise<ExternalRentalAgreement | null>;
  findByAgreementNumber(
    agreementNumber: string,
  ): Promise<ExternalRentalAgreement | null>;
  /**
   * Active (non-CANCELLED) agreement for a rental order, if any.
   * Enforces BD-4 / BD-C3 claim slot used by create and dispatch/return.
   */
  findActiveByRentalOrderId(
    rentalOrderId: RentalOrderId,
  ): Promise<ExternalRentalAgreement | null>;
  findPaged(
    query: ExternalRentalListQuery,
  ): Promise<PaginatedResult<ExternalRentalAgreement>>;
  create(
    data: CreateExternalRentalAgreementData,
  ): Promise<ExternalRentalAgreement>;
  /**
   * Persist confirm / receive / allocate workflow state (status, money, item counters).
   * Does not touch Inventory or RentalOrderItem.reservedQuantity.
   *
   * @deprecated Phase 29 (F-02): use `applyWorkflowDelta` /
   * `claimStatusTransition` / `applySettlement`. Retained for
   * backward-compatible tests / migrations only.
   */
  updateWorkflow(
    id: ExternalRentalAgreementId,
    data: UpdateExternalRentalWorkflowData,
  ): Promise<ExternalRentalAgreement>;
  /**
   * Phase 29 (F-02): atomically claim a once-only status transition
   * (DRAFT→CONFIRMED, DRAFT|CONFIRMED→CANCELLED). Returns the updated
   * aggregate on success, null when zero rows match. Also updates
   * settlementStatus/amountDue when passed (used by Cancel and Confirm
   * follow-ups).
   */
  claimStatusTransition(
    id: ExternalRentalAgreementId,
    expected:
      | ExternalRentalAgreementStatus
      | ReadonlyArray<ExternalRentalAgreementStatus>,
    next: {
      status: ExternalRentalAgreementStatus;
      settlementStatus?: ExternalRentalSettlementStatus;
      amountDueAbsolute?: number;
      amountPaidAbsolute?: number;
      totalHireInCostAbsolute?: number;
    },
  ): Promise<ExternalRentalAgreement | null>;
  /**
   * Phase 29 (F-02): apply an atomic workflow delta. Parent status flips
   * via `updateMany` claim; per-item counters via Prisma { increment }.
   * Returns null when the parent status claim matches zero rows, or
   * throws when a per-item invariant is violated by a concurrent commit.
   */
  applyWorkflowDelta(
    id: ExternalRentalAgreementId,
    data: ApplyExternalRentalWorkflowDeltaData,
  ): Promise<ExternalRentalAgreement | null>;
  /**
   * Phase 29 (F-02, decision §12.3): atomically apply a settlement
   * payment. Uses a predicated raw-SQL UPDATE that guarantees
   * `amountPaid + delta <= amountDue`. Returns the updated aggregate on
   * success, or null when the predicate fails (would exceed amountDue).
   * settlementStatus is derived from the post-increment amountPaid.
   */
  applySettlement(
    id: ExternalRentalAgreementId,
    paymentAmount: number,
  ): Promise<ExternalRentalAgreement | null>;
}
