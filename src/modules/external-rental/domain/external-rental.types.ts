import type {
  ExternalRentalAgreementId,
  ExternalRentalAgreementItemId,
  ProductId,
  RentalOrderId,
  RentalOrderItemId,
  SupplierId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

import type {
  ExternalRentalAgreementStatus,
  ExternalRentalSettlementStatus,
} from "./external-rental.constants";

export interface ExternalRentalAgreementItemProps {
  id: ExternalRentalAgreementItemId | string;
  productId: ProductId;
  rentalOrderItemId: RentalOrderItemId;
  quantityRequested: number;
  quantityConfirmed: number;
  quantityReceived: number;
  quantityAllocated: number;
  quantityDispatched: number;
  quantityReturnedFromCustomer: number;
  quantityReturnedToSupplier: number;
  quantityWrittenOff: number;
  unitCost: number;
  lineHireInCost: number;
  notes: string | null;
}

export interface CreateExternalRentalAgreementItemData {
  productId: ProductId;
  rentalOrderItemId: RentalOrderItemId;
  quantityRequested: number;
  unitCost: number;
  notes?: string | null;
}

export interface CreateExternalRentalAgreementData {
  agreementNumber: string;
  supplierId: SupplierId;
  warehouseId: WarehouseId;
  rentalOrderId: RentalOrderId;
  hireStartDate: Date;
  hireEndDate: Date;
  expectedReturnToSupplierDate: Date;
  remarks?: string | null;
  createdById: UserId;
  items: CreateExternalRentalAgreementItemData[];
}

export interface ConfirmExternalRentalItemData {
  rentalOrderItemId: RentalOrderItemId;
  quantityConfirmed: number;
}

export interface ReceiveExternalRentalItemData {
  rentalOrderItemId: RentalOrderItemId;
  quantity: number;
}

export interface AllocateExternalRentalItemData {
  rentalOrderItemId: RentalOrderItemId;
  quantity: number;
}

export interface DispatchExternalRentalItemData {
  rentalOrderItemId: RentalOrderItemId;
  quantity: number;
}

export interface CustomerReturnExternalRentalItemData {
  rentalOrderItemId: RentalOrderItemId;
  quantity: number;
}

export interface SupplierReturnExternalRentalItemData {
  rentalOrderItemId: RentalOrderItemId;
  quantity: number;
}

export interface WriteOffExternalRentalItemData {
  rentalOrderItemId: RentalOrderItemId;
  quantity: number;
}

export interface RecordExternalRentalPaymentData {
  paymentAmount: number;
}

export interface UpdateExternalRentalWorkflowData {
  status: ExternalRentalAgreementStatus;
  settlementStatus: ExternalRentalSettlementStatus;
  totalHireInCost: number;
  amountDue: number;
  amountPaid: number;
  items: Array<{
    id: string;
    quantityConfirmed: number;
    quantityReceived: number;
    quantityAllocated: number;
    quantityDispatched: number;
    quantityReturnedFromCustomer: number;
    quantityReturnedToSupplier: number;
    quantityWrittenOff: number;
    lineHireInCost: number;
  }>;
}

export interface ExternalRentalAgreementProps {
  id: ExternalRentalAgreementId;
  agreementNumber: string;
  supplierId: SupplierId;
  warehouseId: WarehouseId;
  rentalOrderId: RentalOrderId;
  status: ExternalRentalAgreementStatus;
  settlementStatus: ExternalRentalSettlementStatus;
  hireStartDate: Date;
  hireEndDate: Date;
  expectedReturnToSupplierDate: Date;
  totalHireInCost: number;
  amountDue: number;
  amountPaid: number;
  remarks: string | null;
  createdById: UserId;
  items: ExternalRentalAgreementItemProps[];
  createdAt: Date;
  updatedAt: Date;
}

/** Derived custody balances — not persisted; computed from item counters. */
export interface ExternalRentalCustodyBalances {
  qtyWithCustomer: number;
  qtyInCompanyCustody: number;
  qtyOwedToSupplier: number;
}
