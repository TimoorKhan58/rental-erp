import {
  ExternalRentalAgreement,
  computeCustodyBalances,
} from "@/modules/external-rental/domain";
import type { CreateExternalRentalAgreementData } from "@/modules/external-rental/domain";
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
