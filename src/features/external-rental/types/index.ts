import type { PaginationMeta } from "@/types/api";

export const EXTERNAL_RENTAL_AGREEMENT_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "ALLOCATED",
  "IN_USE",
  "RETURN_PENDING",
  "RETURNED",
  "CANCELLED",
] as const;

export type ExternalRentalAgreementStatus =
  (typeof EXTERNAL_RENTAL_AGREEMENT_STATUSES)[number];

export const EXTERNAL_RENTAL_SETTLEMENT_STATUSES = [
  "UNSETTLED",
  "PARTIALLY_SETTLED",
  "SETTLED",
] as const;

export type ExternalRentalSettlementStatus =
  (typeof EXTERNAL_RENTAL_SETTLEMENT_STATUSES)[number];

export type ExternalRentalItemResponse = {
  id: string;
  productId: string;
  rentalOrderItemId: string;
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
  qtyWithCustomer: number;
  qtyInCompanyCustody: number;
  qtyOwedToSupplier: number;
};

export type ExternalRentalResponse = {
  id: string;
  agreementNumber: string;
  supplierId: string;
  warehouseId: string;
  rentalOrderId: string;
  status: ExternalRentalAgreementStatus;
  settlementStatus: ExternalRentalSettlementStatus;
  hireStartDate: string;
  hireEndDate: string;
  expectedReturnToSupplierDate: string;
  totalHireInCost: number;
  amountDue: number;
  amountPaid: number;
  outstandingBalance: number;
  remarks: string | null;
  createdById: string;
  items: ExternalRentalItemResponse[];
  createdAt: string;
  updatedAt: string;
};

export type ExternalRentalListResponse = {
  items: ExternalRentalResponse[];
  meta: PaginationMeta;
};

export type ExternalRentalSortField =
  | "agreementNumber"
  | "hireStartDate"
  | "hireEndDate"
  | "status"
  | "settlementStatus"
  | "createdAt";

export type ListExternalRentalsParams = {
  page?: number;
  pageSize?: number;
  sortBy?: ExternalRentalSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: ExternalRentalAgreementStatus;
  settlementStatus?: ExternalRentalSettlementStatus;
  supplierId?: string;
  warehouseId?: string;
  rentalOrderId?: string;
  hireStartFrom?: string;
  hireStartTo?: string;
};

export type ExternalRentalLineItemPayload = {
  productId: string;
  rentalOrderItemId: string;
  quantityRequested: number;
  unitCost: number;
  notes?: string | null;
};

export type CreateExternalRentalPayload = {
  agreementNumber?: string;
  supplierId: string;
  warehouseId: string;
  rentalOrderId: string;
  hireStartDate: string;
  hireEndDate: string;
  expectedReturnToSupplierDate: string;
  remarks?: string | null;
  items: ExternalRentalLineItemPayload[];
};

export type ConfirmExternalRentalPayload = {
  items?: Array<{
    rentalOrderItemId: string;
    quantityConfirmed: number;
  }>;
};

export type QtyItemsPayload = {
  items: Array<{
    rentalOrderItemId: string;
    quantity: number;
  }>;
};

export type SettleExternalRentalPayload = {
  paymentAmount: number;
};
