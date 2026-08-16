import {
  ExternalRentalAgreement,
  computeCustodyBalances,
  computeLineHireInCost,
} from "@/modules/external-rental/domain";
import type {
  ApplyExternalRentalWorkflowDeltaData,
  CreateExternalRentalAgreementData,
  ExternalRentalAgreementStatus,
  ExternalRentalWorkflowItemDelta,
  ExternalRentalWorkflowKind,
} from "@/modules/external-rental/domain";
import type {
  ExternalRentalAgreementId,
  ProductId,
  RentalOrderId,
  RentalOrderItemId,
  SupplierId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

import type { ExternalRentalAgreementDto } from "../dtos/external-rental.dto";
import type { CreateExternalRentalInput } from "../schemas/external-rental.schemas";

export function toExternalRentalAgreementId(
  id: string,
): ExternalRentalAgreementId {
  return id as ExternalRentalAgreementId;
}

export function toRentalOrderItemId(id: string): RentalOrderItemId {
  return id as RentalOrderItemId;
}

export function toUserId(id: string): UserId {
  return id as UserId;
}

export function toExternalRentalAgreementDto(
  agreement: ExternalRentalAgreement,
): ExternalRentalAgreementDto {
  return {
    id: agreement.id,
    agreementNumber: agreement.agreementNumber,
    supplierId: agreement.supplierId,
    warehouseId: agreement.warehouseId,
    rentalOrderId: agreement.rentalOrderId,
    status: agreement.status,
    settlementStatus: agreement.settlementStatus,
    hireStartDate: agreement.hireStartDate.toISOString(),
    hireEndDate: agreement.hireEndDate.toISOString(),
    expectedReturnToSupplierDate:
      agreement.expectedReturnToSupplierDate.toISOString(),
    totalHireInCost: agreement.totalHireInCost,
    amountDue: agreement.amountDue,
    amountPaid: agreement.amountPaid,
    outstandingBalance: agreement.getOutstandingBalance(),
    remarks: agreement.remarks,
    createdById: agreement.createdById,
    items: agreement.items.map((item) => {
      const custody = computeCustodyBalances(item);

      return {
        id: String(item.id),
        productId: item.productId,
        rentalOrderItemId: item.rentalOrderItemId,
        quantityRequested: item.quantityRequested,
        quantityConfirmed: item.quantityConfirmed,
        quantityReceived: item.quantityReceived,
        quantityAllocated: item.quantityAllocated,
        quantityDispatched: item.quantityDispatched,
        quantityReturnedFromCustomer: item.quantityReturnedFromCustomer,
        quantityReturnedToSupplier: item.quantityReturnedToSupplier,
        quantityWrittenOff: item.quantityWrittenOff,
        unitCost: item.unitCost,
        lineHireInCost: item.lineHireInCost,
        notes: item.notes,
        qtyWithCustomer: custody.qtyWithCustomer,
        qtyInCompanyCustody: custody.qtyInCompanyCustody,
        qtyOwedToSupplier: custody.qtyOwedToSupplier,
      };
    }),
    createdAt: agreement.createdAt.toISOString(),
    updatedAt: agreement.updatedAt.toISOString(),
  };
}

export function toCreateExternalRentalAgreementData(
  input: Omit<CreateExternalRentalInput, "agreementNumber"> & {
    agreementNumber: string;
  },
  createdById: UserId,
): CreateExternalRentalAgreementData {
  return {
    agreementNumber: input.agreementNumber,
    supplierId: input.supplierId as SupplierId,
    warehouseId: input.warehouseId as WarehouseId,
    rentalOrderId: input.rentalOrderId as RentalOrderId,
    hireStartDate: input.hireStartDate,
    hireEndDate: input.hireEndDate,
    expectedReturnToSupplierDate: input.expectedReturnToSupplierDate,
    remarks: input.remarks ?? null,
    createdById,
    items: input.items.map((item) => ({
      productId: item.productId as ProductId,
      rentalOrderItemId: item.rentalOrderItemId as RentalOrderItemId,
      quantityRequested: item.quantityRequested,
      unitCost: item.unitCost,
      notes: item.notes ?? null,
    })),
  };
}

export function toExternalRentalWorkflowData(
  agreement: ExternalRentalAgreement,
) {
  return {
    status: agreement.status,
    settlementStatus: agreement.settlementStatus,
    totalHireInCost: agreement.totalHireInCost,
    amountDue: agreement.amountDue,
    amountPaid: agreement.amountPaid,
    items: agreement.items.map((item) => ({
      id: String(item.id),
      quantityConfirmed: item.quantityConfirmed,
      quantityReceived: item.quantityReceived,
      quantityAllocated: item.quantityAllocated,
      quantityDispatched: item.quantityDispatched,
      quantityReturnedFromCustomer: item.quantityReturnedFromCustomer,
      quantityReturnedToSupplier: item.quantityReturnedToSupplier,
      quantityWrittenOff: item.quantityWrittenOff,
      lineHireInCost: item.lineHireInCost,
    })),
  };
}

/**
 * Phase 29 (F-02): compute per-item deltas from before/after aggregate
 * snapshots produced by the domain (e.g. `existing.withReceived(input)`).
 * Deltas are consumed by `applyWorkflowDelta` to drive atomic
 * `{ increment }` operators; callers never persist absolute counter values.
 */
export function computeExternalRentalWorkflowDelta(args: {
  workflowKind: ExternalRentalWorkflowKind;
  before: ExternalRentalAgreement;
  after: ExternalRentalAgreement;
  expectedStatuses: ReadonlyArray<ExternalRentalAgreementStatus>;
  recomputeMoney: boolean;
}): ApplyExternalRentalWorkflowDeltaData {
  const beforeItems = new Map(
    args.before.items.map((item) => [String(item.id), item]),
  );

  const items: ExternalRentalWorkflowItemDelta[] = args.after.items.map(
    (afterItem) => {
      const itemId = String(afterItem.id);
      const beforeItem = beforeItems.get(itemId);
      if (beforeItem === undefined) {
        return { itemId };
      }

      const delta: ExternalRentalWorkflowItemDelta = { itemId };

      if (
        afterItem.quantityConfirmed !== beforeItem.quantityConfirmed &&
        beforeItem.quantityConfirmed === 0
      ) {
        delta.quantityConfirmedAbsolute = afterItem.quantityConfirmed;
      }

      const receivedDelta =
        afterItem.quantityReceived - beforeItem.quantityReceived;
      if (receivedDelta !== 0) {
        delta.quantityReceivedDelta = receivedDelta;
      }

      const allocatedDelta =
        afterItem.quantityAllocated - beforeItem.quantityAllocated;
      if (allocatedDelta !== 0) {
        delta.quantityAllocatedDelta = allocatedDelta;
      }

      const dispatchedDelta =
        afterItem.quantityDispatched - beforeItem.quantityDispatched;
      if (dispatchedDelta !== 0) {
        delta.quantityDispatchedDelta = dispatchedDelta;
      }

      const returnedFromCustomerDelta =
        afterItem.quantityReturnedFromCustomer -
        beforeItem.quantityReturnedFromCustomer;
      if (returnedFromCustomerDelta !== 0) {
        delta.quantityReturnedFromCustomerDelta = returnedFromCustomerDelta;
      }

      const returnedToSupplierDelta =
        afterItem.quantityReturnedToSupplier -
        beforeItem.quantityReturnedToSupplier;
      if (returnedToSupplierDelta !== 0) {
        delta.quantityReturnedToSupplierDelta = returnedToSupplierDelta;
      }

      const writtenOffDelta =
        afterItem.quantityWrittenOff - beforeItem.quantityWrittenOff;
      if (writtenOffDelta !== 0) {
        delta.quantityWrittenOffDelta = writtenOffDelta;
      }

      if (receivedDelta !== 0) {
        // BD-11 recognition: lineHireInCost tracks quantityReceived × unitCost.
        delta.lineHireInCostDelta =
          computeLineHireInCost(afterItem.quantityReceived, afterItem.unitCost) -
          computeLineHireInCost(beforeItem.quantityReceived, beforeItem.unitCost);
      }

      return delta;
    },
  );

  return {
    workflowKind: args.workflowKind,
    expectedStatuses: args.expectedStatuses,
    nextStatus: args.after.status,
    items,
    recomputeMoney: args.recomputeMoney,
  };
}
