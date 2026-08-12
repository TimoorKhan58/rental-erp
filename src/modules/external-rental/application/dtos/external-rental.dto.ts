import type {
  ExternalRentalAgreementStatus,
  ExternalRentalSettlementStatus,
} from "@/modules/external-rental/domain";

export interface ExternalRentalAgreementItemDto {
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
}

export interface ExternalRentalAgreementDto {
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
  items: ExternalRentalAgreementItemDto[];
  createdAt: string;
  updatedAt: string;
}
