import type { ExternalRentalAgreementId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type {
  ExternalRentalAgreementStatus,
  ExternalRentalSettlementStatus,
} from "./external-rental.constants";
import {
  ExternalRentalInvalidAllocateError,
  ExternalRentalInvalidCustomerReturnError,
  ExternalRentalInvalidDispatchError,
  ExternalRentalInvalidReceiveError,
  ExternalRentalInvalidSettlementError,
  ExternalRentalInvalidSupplierReturnError,
  ExternalRentalInvariantError,
  createExternalRentalAgreementNumber,
} from "./external-rental.errors";
import {
  assertCanAllocate,
  assertCanCancel,
  assertCanConfirm,
  assertCanCustomerReturnExternal,
  assertCanDispatchExternal,
  assertCanReceive,
  assertCanRecordSettlement,
  assertCanSupplierReturn,
  assertQuantityPipelineInvariants,
  assertValidHirePeriod,
  computeCustodyBalances,
  computeProvisionalAmountDue,
  computeRecognizedHireInTotals,
  computeStatusAfterAllocate,
  computeStatusAfterCustomerReturn,
  computeStatusAfterExternalDispatch,
  computeStatusAfterReceive,
  computeStatusAfterSupplierReturn,
  deriveSettlementStatus,
  normalizeExternalRentalAgreementProps,
  normalizeOptionalText,
  roundMoney,
  validateCreateExternalRentalItems,
  validateNonNegativeMoney,
  validatePositiveQuantity,
} from "./external-rental.rules";
import type {
  AllocateExternalRentalItemData,
  ConfirmExternalRentalItemData,
  CreateExternalRentalAgreementData,
  CustomerReturnExternalRentalItemData,
  DispatchExternalRentalItemData,
  ExternalRentalAgreementItemProps,
  ExternalRentalAgreementProps,
  ReceiveExternalRentalItemData,
  RecordExternalRentalPaymentData,
  SupplierReturnExternalRentalItemData,
} from "./external-rental.types";

/**
 * Aggregate root for supplier hire-in / external rental sourcing.
 *
 * Custody counters live on items — never Inventory.quantityOnHand.
 * Confirm / receive / allocate do not touch owned stock or F-02.
 */
export class ExternalRentalAgreement
  implements Entity<ExternalRentalAgreementId>
{
  readonly id: ExternalRentalAgreementId;
  readonly agreementNumber: string;
  readonly supplierId: ExternalRentalAgreementProps["supplierId"];
  readonly warehouseId: ExternalRentalAgreementProps["warehouseId"];
  readonly rentalOrderId: ExternalRentalAgreementProps["rentalOrderId"];
  readonly status: ExternalRentalAgreementStatus;
  readonly settlementStatus: ExternalRentalSettlementStatus;
  readonly hireStartDate: Date;
  readonly hireEndDate: Date;
  readonly expectedReturnToSupplierDate: Date;
  readonly totalHireInCost: number;
  readonly amountDue: number;
  readonly amountPaid: number;
  readonly remarks: string | null;
  readonly createdById: ExternalRentalAgreementProps["createdById"];
  readonly items: ExternalRentalAgreementItemProps[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: ExternalRentalAgreementProps) {
    const normalized = normalizeExternalRentalAgreementProps(props);

    this.id = normalized.id;
    this.agreementNumber = normalized.agreementNumber;
    this.supplierId = normalized.supplierId;
    this.warehouseId = normalized.warehouseId;
    this.rentalOrderId = normalized.rentalOrderId;
    this.status = normalized.status;
    this.settlementStatus = normalized.settlementStatus;
    this.hireStartDate = normalized.hireStartDate;
    this.hireEndDate = normalized.hireEndDate;
    this.expectedReturnToSupplierDate = normalized.expectedReturnToSupplierDate;
    this.totalHireInCost = normalized.totalHireInCost;
    this.amountDue = normalized.amountDue;
    this.amountPaid = normalized.amountPaid;
    this.remarks = normalized.remarks;
    this.createdById = normalized.createdById;
    this.items = normalized.items;
    this.createdAt = normalized.createdAt;
    this.updatedAt = normalized.updatedAt;
  }

  static create(
    data: CreateExternalRentalAgreementData,
  ): Omit<
    ExternalRentalAgreementProps,
    "id" | "status" | "settlementStatus" | "createdAt" | "updatedAt"
  > {
    assertValidHirePeriod(data.hireStartDate, data.hireEndDate);

    return {
      agreementNumber: createExternalRentalAgreementNumber(data.agreementNumber),
      supplierId: data.supplierId,
      warehouseId: data.warehouseId,
      rentalOrderId: data.rentalOrderId,
      hireStartDate: data.hireStartDate,
      hireEndDate: data.hireEndDate,
      expectedReturnToSupplierDate: data.expectedReturnToSupplierDate,
      totalHireInCost: 0,
      amountDue: 0,
      amountPaid: 0,
      remarks: normalizeOptionalText(data.remarks),
      createdById: data.createdById,
      items: validateCreateExternalRentalItems(data.items),
    };
  }

  static reconstitute(
    props: ExternalRentalAgreementProps,
  ): ExternalRentalAgreement {
    return new ExternalRentalAgreement(props);
  }

  toProps(): ExternalRentalAgreementProps {
    return {
      id: this.id,
      agreementNumber: this.agreementNumber,
      supplierId: this.supplierId,
      warehouseId: this.warehouseId,
      rentalOrderId: this.rentalOrderId,
      status: this.status,
      settlementStatus: this.settlementStatus,
      hireStartDate: this.hireStartDate,
      hireEndDate: this.hireEndDate,
      expectedReturnToSupplierDate: this.expectedReturnToSupplierDate,
      totalHireInCost: this.totalHireInCost,
      amountDue: this.amountDue,
      amountPaid: this.amountPaid,
      remarks: this.remarks,
      createdById: this.createdById,
      items: this.items.map((item) => ({ ...item })),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  getOutstandingBalance(): number {
    return this.amountDue - this.amountPaid;
  }

  isDraft(): boolean {
    return this.status === "DRAFT";
  }

  isCancelled(): boolean {
    return this.status === "CANCELLED";
  }

  /**
   * DRAFT | CONFIRMED → CANCELLED.
   * Discards provisional amountDue on CONFIRMED cancel. Never mutates Inventory.
   * Post-receive cancel is not supported — use supplier return / settlement.
   */
  withCancelled(): ExternalRentalAgreement {
    assertCanCancel(this.status);

    return ExternalRentalAgreement.reconstitute({
      ...this.toProps(),
      status: "CANCELLED",
      // BD-C5: zero provisional amountDue; totalHireInCost stays 0; amountPaid 0.
      amountDue: 0,
      amountPaid: 0,
      totalHireInCost: 0,
      settlementStatus: "UNSETTLED",
      updatedAt: new Date(),
    });
  }

  /**
   * DRAFT → CONFIRMED.
   * Sets quantityConfirmed (default = requested) and provisional amountDue.
   * totalHireInCost remains 0 until RECEIVE recognition (BD-11).
   */
  withConfirmed(
    confirmItems?: ConfirmExternalRentalItemData[],
  ): ExternalRentalAgreement {
    assertCanConfirm(this.status);
    assertValidHirePeriod(this.hireStartDate, this.hireEndDate);

    if (this.items.length === 0) {
      throw new ExternalRentalInvalidReceiveError(
        "Cannot confirm agreement with no items",
      );
    }

    const confirmMap = new Map<string, number>();

    if (confirmItems !== undefined) {
      for (const confirmItem of confirmItems) {
        const qty = validatePositiveQuantity(
          confirmItem.quantityConfirmed,
          "quantityConfirmed",
        );
        confirmMap.set(confirmItem.rentalOrderItemId, qty);
      }
    }

    const items = this.items.map((item) => {
      const quantityConfirmed =
        confirmMap.get(item.rentalOrderItemId) ?? item.quantityRequested;

      if (quantityConfirmed > item.quantityRequested) {
        throw new ExternalRentalInvariantError(
          "quantityConfirmed cannot exceed quantityRequested",
          "quantityConfirmed",
        );
      }

      const next: ExternalRentalAgreementItemProps = {
        ...item,
        quantityConfirmed,
      };
      assertQuantityPipelineInvariants(next);
      return next;
    });

    if (confirmItems !== undefined) {
      for (const confirmItem of confirmItems) {
        if (
          !this.items.some(
            (item) => item.rentalOrderItemId === confirmItem.rentalOrderItemId,
          )
        ) {
          throw new ExternalRentalInvalidReceiveError(
            "Confirm item does not belong to this agreement",
            confirmItem.rentalOrderItemId,
          );
        }
      }
    }

    const provisionalDue = computeProvisionalAmountDue(items);

    return ExternalRentalAgreement.reconstitute({
      ...this.toProps(),
      status: "CONFIRMED",
      amountDue: provisionalDue,
      totalHireInCost: 0,
      settlementStatus: deriveSettlementStatus(provisionalDue, this.amountPaid),
      items,
      updatedAt: new Date(),
    });
  }

  /**
   * CONFIRMED | PARTIALLY_RECEIVED → PARTIALLY_RECEIVED | RECEIVED.
   * Recognizes hire-in cost at receive (BD-11). Never mutates Inventory.
   */
  withReceived(
    receiveItems: ReceiveExternalRentalItemData[],
  ): ExternalRentalAgreement {
    assertCanReceive(this.status);

    if (receiveItems.length === 0) {
      throw new ExternalRentalInvalidReceiveError(
        "At least one item must be provided for receive",
      );
    }

    const receiveMap = new Map<string, number>();

    for (const receiveItem of receiveItems) {
      const qty = validatePositiveQuantity(receiveItem.quantity, "quantity");
      const existingDelta = receiveMap.get(receiveItem.rentalOrderItemId) ?? 0;
      receiveMap.set(receiveItem.rentalOrderItemId, existingDelta + qty);
    }

    for (const rentalOrderItemId of receiveMap.keys()) {
      if (
        !this.items.some((item) => item.rentalOrderItemId === rentalOrderItemId)
      ) {
        throw new ExternalRentalInvalidReceiveError(
          "Receive item does not belong to this agreement",
          rentalOrderItemId,
        );
      }
    }

    const items = this.items.map((item) => {
      const delta = receiveMap.get(item.rentalOrderItemId) ?? 0;
      if (delta === 0) {
        return { ...item };
      }

      const quantityReceived = item.quantityReceived + delta;

      if (quantityReceived > item.quantityConfirmed) {
        throw new ExternalRentalInvalidReceiveError(
          "quantityReceived cannot exceed quantityConfirmed",
          item.rentalOrderItemId,
        );
      }

      const next: ExternalRentalAgreementItemProps = {
        ...item,
        quantityReceived,
      };
      assertQuantityPipelineInvariants(next);
      return next;
    });

    const recognized = computeRecognizedHireInTotals(items);
    const itemsWithCost = items.map((item, index) => ({
      ...item,
      lineHireInCost: recognized.items[index] ?? 0,
    }));

    return ExternalRentalAgreement.reconstitute({
      ...this.toProps(),
      status: computeStatusAfterReceive(itemsWithCost),
      totalHireInCost: recognized.totalHireInCost,
      amountDue: recognized.amountDue,
      settlementStatus: deriveSettlementStatus(
        recognized.amountDue,
        this.amountPaid,
      ),
      items: itemsWithCost,
      updatedAt: new Date(),
    });
  }

  /**
   * Increases quantityAllocated (delta). Does not touch RentalOrderItem.reservedQuantity.
   */
  withAllocated(
    allocateItems: AllocateExternalRentalItemData[],
  ): ExternalRentalAgreement {
    assertCanAllocate(this.status);

    if (allocateItems.length === 0) {
      throw new ExternalRentalInvalidAllocateError(
        "At least one item must be provided for allocate",
      );
    }

    const allocateMap = new Map<string, number>();

    for (const allocateItem of allocateItems) {
      const qty = validatePositiveQuantity(allocateItem.quantity, "quantity");
      const existingDelta = allocateMap.get(allocateItem.rentalOrderItemId) ?? 0;
      allocateMap.set(allocateItem.rentalOrderItemId, existingDelta + qty);
    }

    for (const rentalOrderItemId of allocateMap.keys()) {
      if (
        !this.items.some((item) => item.rentalOrderItemId === rentalOrderItemId)
      ) {
        throw new ExternalRentalInvalidAllocateError(
          "Allocate item does not belong to this agreement",
          rentalOrderItemId,
        );
      }
    }

    const items = this.items.map((item) => {
      const delta = allocateMap.get(item.rentalOrderItemId) ?? 0;
      if (delta === 0) {
        return { ...item };
      }

      if (item.quantityReceived <= 0) {
        throw new ExternalRentalInvalidAllocateError(
          "Cannot allocate before receipt",
          item.rentalOrderItemId,
        );
      }

      const quantityAllocated = item.quantityAllocated + delta;

      if (quantityAllocated > item.quantityReceived) {
        throw new ExternalRentalInvalidAllocateError(
          "quantityAllocated cannot exceed quantityReceived",
          item.rentalOrderItemId,
        );
      }

      const next: ExternalRentalAgreementItemProps = {
        ...item,
        quantityAllocated,
      };
      assertQuantityPipelineInvariants(next);
      return next;
    });

    return ExternalRentalAgreement.reconstitute({
      ...this.toProps(),
      status: computeStatusAfterAllocate(items),
      items,
      updatedAt: new Date(),
    });
  }

  /**
   * Increases quantityDispatched (delta). Never mutates Inventory / reservedQuantity.
   */
  withDispatched(
    dispatchItems: DispatchExternalRentalItemData[],
  ): ExternalRentalAgreement {
    assertCanDispatchExternal(this.status);

    if (dispatchItems.length === 0) {
      throw new ExternalRentalInvalidDispatchError(
        "At least one item must be provided for external dispatch",
      );
    }

    const dispatchMap = new Map<string, number>();

    for (const dispatchItem of dispatchItems) {
      const qty = validatePositiveQuantity(dispatchItem.quantity, "quantity");
      const existingDelta = dispatchMap.get(dispatchItem.rentalOrderItemId) ?? 0;
      dispatchMap.set(dispatchItem.rentalOrderItemId, existingDelta + qty);
    }

    for (const rentalOrderItemId of dispatchMap.keys()) {
      if (
        !this.items.some((item) => item.rentalOrderItemId === rentalOrderItemId)
      ) {
        throw new ExternalRentalInvalidDispatchError(
          "Dispatch item does not belong to this agreement",
          rentalOrderItemId,
        );
      }
    }

    const items = this.items.map((item) => {
      const delta = dispatchMap.get(item.rentalOrderItemId) ?? 0;
      if (delta === 0) {
        return { ...item };
      }

      if (item.quantityAllocated <= 0) {
        throw new ExternalRentalInvalidDispatchError(
          "Cannot dispatch external quantity before allocation",
          item.rentalOrderItemId,
        );
      }

      const quantityDispatched = item.quantityDispatched + delta;

      if (quantityDispatched > item.quantityAllocated) {
        throw new ExternalRentalInvalidDispatchError(
          "quantityDispatched cannot exceed quantityAllocated",
          item.rentalOrderItemId,
        );
      }

      const next: ExternalRentalAgreementItemProps = {
        ...item,
        quantityDispatched,
      };
      assertQuantityPipelineInvariants(next);
      return next;
    });

    return ExternalRentalAgreement.reconstitute({
      ...this.toProps(),
      status: computeStatusAfterExternalDispatch(items, this.status),
      items,
      updatedAt: new Date(),
    });
  }

  /**
   * Increases quantityReturnedFromCustomer (delta).
   * Does NOT mutate quantityReturnedToSupplier or Inventory.
   */
  withCustomerReturned(
    returnItems: CustomerReturnExternalRentalItemData[],
  ): ExternalRentalAgreement {
    assertCanCustomerReturnExternal(this.status);

    if (returnItems.length === 0) {
      throw new ExternalRentalInvalidCustomerReturnError(
        "At least one item must be provided for external customer return",
      );
    }

    const returnMap = new Map<string, number>();

    for (const returnItem of returnItems) {
      const qty = validatePositiveQuantity(returnItem.quantity, "quantity");
      const existingDelta = returnMap.get(returnItem.rentalOrderItemId) ?? 0;
      returnMap.set(returnItem.rentalOrderItemId, existingDelta + qty);
    }

    for (const rentalOrderItemId of returnMap.keys()) {
      if (
        !this.items.some((item) => item.rentalOrderItemId === rentalOrderItemId)
      ) {
        throw new ExternalRentalInvalidCustomerReturnError(
          "Return item does not belong to this agreement",
          rentalOrderItemId,
        );
      }
    }

    const items = this.items.map((item) => {
      const delta = returnMap.get(item.rentalOrderItemId) ?? 0;
      if (delta === 0) {
        return { ...item };
      }

      const quantityReturnedFromCustomer =
        item.quantityReturnedFromCustomer + delta;

      if (quantityReturnedFromCustomer > item.quantityDispatched) {
        throw new ExternalRentalInvalidCustomerReturnError(
          "quantityReturnedFromCustomer cannot exceed quantityDispatched",
          item.rentalOrderItemId,
        );
      }

      const next: ExternalRentalAgreementItemProps = {
        ...item,
        quantityReturnedFromCustomer,
      };
      assertQuantityPipelineInvariants(next);
      return next;
    });

    return ExternalRentalAgreement.reconstitute({
      ...this.toProps(),
      status: computeStatusAfterCustomerReturn(items),
      items,
      updatedAt: new Date(),
    });
  }

  /**
   * Returns external custody qty to the supplier.
   * Locked §9.6: delta ≤ qtyInCompanyCustody. Never mutates Inventory.
   */
  withSupplierReturned(
    returnItems: SupplierReturnExternalRentalItemData[],
  ): ExternalRentalAgreement {
    assertCanSupplierReturn(this.status);

    if (returnItems.length === 0) {
      throw new ExternalRentalInvalidSupplierReturnError(
        "At least one item must be provided for supplier return",
      );
    }

    const returnMap = new Map<string, number>();

    for (const returnItem of returnItems) {
      const qty = validatePositiveQuantity(returnItem.quantity, "quantity");
      const existingDelta = returnMap.get(returnItem.rentalOrderItemId) ?? 0;
      returnMap.set(returnItem.rentalOrderItemId, existingDelta + qty);
    }

    for (const rentalOrderItemId of returnMap.keys()) {
      if (
        !this.items.some((item) => item.rentalOrderItemId === rentalOrderItemId)
      ) {
        throw new ExternalRentalInvalidSupplierReturnError(
          "Return item does not belong to this agreement",
          rentalOrderItemId,
        );
      }
    }

    const items = this.items.map((item) => {
      const delta = returnMap.get(item.rentalOrderItemId) ?? 0;
      if (delta === 0) {
        return { ...item };
      }

      const custody = computeCustodyBalances(item);
      if (delta > custody.qtyInCompanyCustody) {
        throw new ExternalRentalInvalidSupplierReturnError(
          custody.qtyInCompanyCustody <= 0
            ? "No external company custody available for supplier return"
            : "Supplier return quantity exceeds qtyInCompanyCustody",
          item.rentalOrderItemId,
        );
      }

      const quantityReturnedToSupplier =
        item.quantityReturnedToSupplier + delta;

      const next: ExternalRentalAgreementItemProps = {
        ...item,
        quantityReturnedToSupplier,
      };
      assertQuantityPipelineInvariants(next);
      return next;
    });

    return ExternalRentalAgreement.reconstitute({
      ...this.toProps(),
      status: computeStatusAfterSupplierReturn(items),
      items,
      updatedAt: new Date(),
    });
  }

  /**
   * Records a settlement payment against amountDue (BD-10 / BD-11).
   * Orthogonal to operational status. No SupplierPayment entity in MVP.
   */
  withPaymentRecorded(
    data: RecordExternalRentalPaymentData,
  ): ExternalRentalAgreement {
    assertCanRecordSettlement(this.status);

    const paymentAmount = validateNonNegativeMoney(
      data.paymentAmount,
      "paymentAmount",
    );

    if (paymentAmount <= 0) {
      throw new ExternalRentalInvalidSettlementError(
        "paymentAmount must be greater than zero",
        "paymentAmount",
      );
    }

    if (this.amountDue <= 0) {
      throw new ExternalRentalInvalidSettlementError(
        "Cannot settle agreement with no amountDue",
        "amountDue",
      );
    }

    const amountPaid = roundMoney(this.amountPaid + paymentAmount);

    if (amountPaid > this.amountDue) {
      throw new ExternalRentalInvalidSettlementError(
        "amountPaid cannot exceed amountDue",
        "amountPaid",
      );
    }

    return ExternalRentalAgreement.reconstitute({
      ...this.toProps(),
      amountPaid,
      settlementStatus: deriveSettlementStatus(this.amountDue, amountPaid),
      updatedAt: new Date(),
    });
  }
}
