import type {
  ExternalRentalAgreementStatus,
  ExternalRentalSettlementStatus,
} from "./external-rental.constants";
import {
  ExternalRentalInvalidStatusError,
  ExternalRentalInvariantError,
} from "./external-rental.errors";
import type {
  CreateExternalRentalAgreementItemData,
  ExternalRentalAgreementItemProps,
  ExternalRentalAgreementProps,
  ExternalRentalCustodyBalances,
} from "./external-rental.types";

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function validateNonNegativeMoney(
  value: number,
  field: string,
): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new ExternalRentalInvariantError(
      `${field} must be a finite non-negative number`,
      field,
    );
  }

  return roundMoney(value);
}

export function validateNonNegativeQuantity(
  value: number,
  field: string,
): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new ExternalRentalInvariantError(
      `${field} must be a non-negative integer`,
      field,
    );
  }

  return value;
}

export function validatePositiveQuantity(
  value: number,
  field: string,
): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ExternalRentalInvariantError(
      `${field} must be a positive integer`,
      field,
    );
  }

  return value;
}

/**
 * Locked quantity pipeline invariants (Phase 25.5.1 §7).
 * All counters are cumulative non-negative integers.
 */
export function assertQuantityPipelineInvariants(
  item: Pick<
    ExternalRentalAgreementItemProps,
    | "quantityRequested"
    | "quantityConfirmed"
    | "quantityReceived"
    | "quantityAllocated"
    | "quantityDispatched"
    | "quantityReturnedFromCustomer"
    | "quantityReturnedToSupplier"
    | "quantityWrittenOff"
  >,
  fieldPrefix = "item",
): void {
  const requested = validateNonNegativeQuantity(
    item.quantityRequested,
    `${fieldPrefix}.quantityRequested`,
  );
  const confirmed = validateNonNegativeQuantity(
    item.quantityConfirmed,
    `${fieldPrefix}.quantityConfirmed`,
  );
  const received = validateNonNegativeQuantity(
    item.quantityReceived,
    `${fieldPrefix}.quantityReceived`,
  );
  const allocated = validateNonNegativeQuantity(
    item.quantityAllocated,
    `${fieldPrefix}.quantityAllocated`,
  );
  const dispatched = validateNonNegativeQuantity(
    item.quantityDispatched,
    `${fieldPrefix}.quantityDispatched`,
  );
  const returnedFromCustomer = validateNonNegativeQuantity(
    item.quantityReturnedFromCustomer,
    `${fieldPrefix}.quantityReturnedFromCustomer`,
  );
  const returnedToSupplier = validateNonNegativeQuantity(
    item.quantityReturnedToSupplier,
    `${fieldPrefix}.quantityReturnedToSupplier`,
  );
  const writtenOff = validateNonNegativeQuantity(
    item.quantityWrittenOff,
    `${fieldPrefix}.quantityWrittenOff`,
  );

  if (confirmed > requested) {
    throw new ExternalRentalInvariantError(
      "quantityConfirmed cannot exceed quantityRequested",
      `${fieldPrefix}.quantityConfirmed`,
    );
  }

  if (received > confirmed) {
    throw new ExternalRentalInvariantError(
      "quantityReceived cannot exceed quantityConfirmed",
      `${fieldPrefix}.quantityReceived`,
    );
  }

  if (allocated > received) {
    throw new ExternalRentalInvariantError(
      "quantityAllocated cannot exceed quantityReceived",
      `${fieldPrefix}.quantityAllocated`,
    );
  }

  if (dispatched > allocated) {
    throw new ExternalRentalInvariantError(
      "quantityDispatched cannot exceed quantityAllocated",
      `${fieldPrefix}.quantityDispatched`,
    );
  }

  if (returnedFromCustomer > dispatched) {
    throw new ExternalRentalInvariantError(
      "quantityReturnedFromCustomer cannot exceed quantityDispatched",
      `${fieldPrefix}.quantityReturnedFromCustomer`,
    );
  }

  if (returnedToSupplier + writtenOff > received) {
    throw new ExternalRentalInvariantError(
      "quantityReturnedToSupplier + quantityWrittenOff cannot exceed quantityReceived",
      `${fieldPrefix}.quantityReturnedToSupplier`,
    );
  }
}

export function computeCustodyBalances(
  item: Pick<
    ExternalRentalAgreementItemProps,
    | "quantityReceived"
    | "quantityDispatched"
    | "quantityReturnedFromCustomer"
    | "quantityReturnedToSupplier"
    | "quantityWrittenOff"
  >,
): ExternalRentalCustodyBalances {
  const qtyWithCustomer =
    item.quantityDispatched - item.quantityReturnedFromCustomer;
  const qtyInCompanyCustody =
    item.quantityReceived -
    item.quantityDispatched +
    item.quantityReturnedFromCustomer -
    item.quantityReturnedToSupplier -
    item.quantityWrittenOff;
  const qtyOwedToSupplier =
    item.quantityReceived -
    item.quantityReturnedToSupplier -
    item.quantityWrittenOff;

  return {
    qtyWithCustomer,
    qtyInCompanyCustody,
    qtyOwedToSupplier,
  };
}

export function computeLineHireInCost(
  quantityReceived: number,
  unitCost: number,
): number {
  return roundMoney(quantityReceived * unitCost);
}

export function computeOutstandingBalance(
  amountDue: number,
  amountPaid: number,
): number {
  return roundMoney(amountDue - amountPaid);
}

export function deriveSettlementStatus(
  amountDue: number,
  amountPaid: number,
): ExternalRentalSettlementStatus {
  const due = validateNonNegativeMoney(amountDue, "amountDue");
  const paid = validateNonNegativeMoney(amountPaid, "amountPaid");

  if (paid > due) {
    throw new ExternalRentalInvariantError(
      "amountPaid cannot exceed amountDue",
      "amountPaid",
    );
  }

  if (due === 0 || paid >= due) {
    return "SETTLED";
  }

  if (paid > 0) {
    return "PARTIALLY_SETTLED";
  }

  return "UNSETTLED";
}

export function validateCreateExternalRentalItems(
  items: CreateExternalRentalAgreementItemData[],
): ExternalRentalAgreementItemProps[] {
  if (items.length === 0) {
    throw new ExternalRentalInvariantError(
      "External rental agreement must have at least one item",
      "items",
    );
  }

  const rentalOrderItemIds = new Set<string>();

  return items.map((item, index) => {
    const prefix = `items[${index}]`;
    const quantityRequested = validatePositiveQuantity(
      item.quantityRequested,
      `${prefix}.quantityRequested`,
    );
    const unitCost = validateNonNegativeMoney(
      item.unitCost,
      `${prefix}.unitCost`,
    );

    if (rentalOrderItemIds.has(item.rentalOrderItemId)) {
      throw new ExternalRentalInvariantError(
        "Duplicate rental order item in external rental agreement",
        `${prefix}.rentalOrderItemId`,
      );
    }

    rentalOrderItemIds.add(item.rentalOrderItemId);

    const created: ExternalRentalAgreementItemProps = {
      id: "",
      productId: item.productId,
      rentalOrderItemId: item.rentalOrderItemId,
      quantityRequested,
      quantityConfirmed: 0,
      quantityReceived: 0,
      quantityAllocated: 0,
      quantityDispatched: 0,
      quantityReturnedFromCustomer: 0,
      quantityReturnedToSupplier: 0,
      quantityWrittenOff: 0,
      unitCost,
      lineHireInCost: 0,
      notes: normalizeOptionalText(item.notes),
    };

    assertQuantityPipelineInvariants(created, prefix);
    return created;
  });
}

export function normalizeExternalRentalAgreementProps(
  props: ExternalRentalAgreementProps,
): ExternalRentalAgreementProps {
  const amountDue = validateNonNegativeMoney(props.amountDue, "amountDue");
  const amountPaid = validateNonNegativeMoney(props.amountPaid, "amountPaid");
  const totalHireInCost = validateNonNegativeMoney(
    props.totalHireInCost,
    "totalHireInCost",
  );

  if (amountPaid > amountDue) {
    throw new ExternalRentalInvariantError(
      "amountPaid cannot exceed amountDue",
      "amountPaid",
    );
  }

  if (
    Number.isNaN(props.hireStartDate.getTime()) ||
    Number.isNaN(props.hireEndDate.getTime()) ||
    Number.isNaN(props.expectedReturnToSupplierDate.getTime())
  ) {
    throw new ExternalRentalInvariantError(
      "Hire and return dates must be valid",
      "hireStartDate",
    );
  }

  const items = props.items.map((item, index) => {
    const prefix = `items[${index}]`;
    assertQuantityPipelineInvariants(item, prefix);
    return {
      ...item,
      unitCost: validateNonNegativeMoney(item.unitCost, `${prefix}.unitCost`),
      lineHireInCost: validateNonNegativeMoney(
        item.lineHireInCost,
        `${prefix}.lineHireInCost`,
      ),
      notes: normalizeOptionalText(item.notes),
    };
  });

  return {
    ...props,
    totalHireInCost,
    amountDue,
    amountPaid,
    remarks: normalizeOptionalText(props.remarks),
    items,
  };
}

export function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function assertValidHirePeriod(
  hireStartDate: Date,
  hireEndDate: Date,
): void {
  if (
    Number.isNaN(hireStartDate.getTime()) ||
    Number.isNaN(hireEndDate.getTime())
  ) {
    throw new ExternalRentalInvariantError(
      "Hire period dates must be valid",
      "hireStartDate",
    );
  }

  const start = Date.UTC(
    hireStartDate.getUTCFullYear(),
    hireStartDate.getUTCMonth(),
    hireStartDate.getUTCDate(),
  );
  const end = Date.UTC(
    hireEndDate.getUTCFullYear(),
    hireEndDate.getUTCMonth(),
    hireEndDate.getUTCDate(),
  );

  if (end < start) {
    throw new ExternalRentalInvariantError(
      "Hire end date cannot be before hire start date",
      "hireEndDate",
    );
  }
}

export function assertCanConfirm(
  status: ExternalRentalAgreementStatus,
): void {
  if (status !== "DRAFT") {
    throw new ExternalRentalInvalidStatusError(status, "confirm");
  }
}

export function assertCanCancel(
  status: ExternalRentalAgreementStatus,
): void {
  if (status !== "DRAFT" && status !== "CONFIRMED") {
    throw new ExternalRentalInvalidStatusError(status, "cancel");
  }
}

export function assertCanReceive(
  status: ExternalRentalAgreementStatus,
): void {
  if (status !== "CONFIRMED" && status !== "PARTIALLY_RECEIVED") {
    throw new ExternalRentalInvalidStatusError(status, "receive");
  }
}

export function assertCanAllocate(
  status: ExternalRentalAgreementStatus,
): void {
  if (
    status !== "PARTIALLY_RECEIVED" &&
    status !== "RECEIVED" &&
    status !== "ALLOCATED"
  ) {
    throw new ExternalRentalInvalidStatusError(status, "allocate");
  }
}

export function assertCanDispatchExternal(
  status: ExternalRentalAgreementStatus,
): void {
  if (
    status !== "ALLOCATED" &&
    status !== "IN_USE" &&
    status !== "PARTIALLY_RECEIVED" &&
    status !== "RECEIVED"
  ) {
    throw new ExternalRentalInvalidStatusError(status, "dispatch");
  }
}

export function assertCanCustomerReturnExternal(
  status: ExternalRentalAgreementStatus,
): void {
  if (
    status !== "IN_USE" &&
    status !== "RETURN_PENDING" &&
    status !== "ALLOCATED"
  ) {
    throw new ExternalRentalInvalidStatusError(status, "customer-return");
  }
}

export function assertCanSupplierReturn(
  status: ExternalRentalAgreementStatus,
): void {
  if (
    status === "DRAFT" ||
    status === "CONFIRMED" ||
    status === "CANCELLED" ||
    status === "RETURNED"
  ) {
    throw new ExternalRentalInvalidStatusError(status, "supplier-return");
  }
}

/**
 * Phase 27 — write-off allowed only after receive (post-receive operational states).
 * Same status gate as supplier return; per-item received/custody checks are separate.
 */
export function assertCanWriteOff(
  status: ExternalRentalAgreementStatus,
): void {
  if (
    status === "DRAFT" ||
    status === "CONFIRMED" ||
    status === "CANCELLED" ||
    status === "RETURNED"
  ) {
    throw new ExternalRentalInvalidStatusError(status, "write-off");
  }
}

export function assertCanRecordSettlement(
  status: ExternalRentalAgreementStatus,
): void {
  if (status === "DRAFT" || status === "CANCELLED") {
    throw new ExternalRentalInvalidStatusError(status, "settle");
  }
}

export function computeStatusAfterExternalDispatch(
  items: Array<
    Pick<
      ExternalRentalAgreementItemProps,
      "quantityAllocated" | "quantityDispatched"
    >
  >,
  previousStatus: ExternalRentalAgreementStatus,
): ExternalRentalAgreementStatus {
  const anyDispatched = items.some((item) => item.quantityDispatched > 0);
  if (anyDispatched) {
    return "IN_USE";
  }
  return previousStatus;
}

export function computeStatusAfterCustomerReturn(
  items: Array<
    Pick<
      ExternalRentalAgreementItemProps,
      | "quantityDispatched"
      | "quantityReturnedFromCustomer"
      | "quantityReturnedToSupplier"
      | "quantityWrittenOff"
      | "quantityReceived"
    >
  >,
): ExternalRentalAgreementStatus {
  const anyWithCustomer = items.some(
    (item) => item.quantityDispatched > item.quantityReturnedFromCustomer,
  );
  if (anyWithCustomer) {
    return "IN_USE";
  }

  const allClosed = items.every(
    (item) =>
      item.quantityReturnedToSupplier + item.quantityWrittenOff >=
      item.quantityReceived,
  );
  if (allClosed) {
    return "RETURNED";
  }

  return "RETURN_PENDING";
}

/**
 * After supplier return: RETURNED when owed qty is fully closed;
 * otherwise IN_USE if customer still holds stock, else RETURN_PENDING.
 */
export function computeStatusAfterSupplierReturn(
  items: Array<
    Pick<
      ExternalRentalAgreementItemProps,
      | "quantityDispatched"
      | "quantityReturnedFromCustomer"
      | "quantityReturnedToSupplier"
      | "quantityWrittenOff"
      | "quantityReceived"
    >
  >,
): ExternalRentalAgreementStatus {
  return computeStatusAfterCustomerReturn(items);
}

/**
 * After write-off: reuse existing closure semantics (RETURNED when owed closed
 * and no customer holdings remain).
 */
export function computeStatusAfterWriteOff(
  items: Array<
    Pick<
      ExternalRentalAgreementItemProps,
      | "quantityDispatched"
      | "quantityReturnedFromCustomer"
      | "quantityReturnedToSupplier"
      | "quantityWrittenOff"
      | "quantityReceived"
    >
  >,
): ExternalRentalAgreementStatus {
  return computeStatusAfterCustomerReturn(items);
}

export function computeProvisionalAmountDue(
  items: Array<Pick<ExternalRentalAgreementItemProps, "quantityConfirmed" | "unitCost">>,
): number {
  return roundMoney(
    items.reduce(
      (sum, item) => sum + item.quantityConfirmed * item.unitCost,
      0,
    ),
  );
}

export function computeRecognizedHireInTotals(
  items: Array<
    Pick<ExternalRentalAgreementItemProps, "quantityReceived" | "unitCost">
  >,
): { totalHireInCost: number; amountDue: number; items: number[] } {
  const lineCosts = items.map((item) =>
    computeLineHireInCost(item.quantityReceived, item.unitCost),
  );
  const totalHireInCost = roundMoney(
    lineCosts.reduce((sum, cost) => sum + cost, 0),
  );

  return {
    totalHireInCost,
    amountDue: totalHireInCost,
    items: lineCosts,
  };
}

export function computeStatusAfterReceive(
  items: Array<
    Pick<ExternalRentalAgreementItemProps, "quantityConfirmed" | "quantityReceived">
  >,
): ExternalRentalAgreementStatus {
  const allReceived = items.every(
    (item) => item.quantityReceived >= item.quantityConfirmed,
  );

  if (allReceived) {
    return "RECEIVED";
  }

  const anyReceived = items.some((item) => item.quantityReceived > 0);
  return anyReceived ? "PARTIALLY_RECEIVED" : "CONFIRMED";
}

export function computeStatusAfterAllocate(
  items: Array<
    Pick<
      ExternalRentalAgreementItemProps,
      "quantityConfirmed" | "quantityReceived" | "quantityAllocated"
    >
  >,
): ExternalRentalAgreementStatus {
  const fullyReceived = items.every(
    (item) => item.quantityReceived >= item.quantityConfirmed,
  );
  const fullyAllocated = items.every(
    (item) => item.quantityAllocated >= item.quantityReceived,
  );

  if (fullyReceived && fullyAllocated) {
    return "ALLOCATED";
  }

  if (fullyReceived) {
    return "RECEIVED";
  }

  return items.some((item) => item.quantityReceived > 0)
    ? "PARTIALLY_RECEIVED"
    : "CONFIRMED";
}
