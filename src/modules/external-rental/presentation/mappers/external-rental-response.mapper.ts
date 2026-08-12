import type { ExternalRentalAgreementDto } from "@/modules/external-rental/application/dtos/external-rental.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface ExternalRentalItemResponse {
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

export interface ExternalRentalResponse {
  id: string;
  agreementNumber: string;
  supplierId: string;
  warehouseId: string;
  rentalOrderId: string;
  status: ExternalRentalAgreementDto["status"];
  settlementStatus: ExternalRentalAgreementDto["settlementStatus"];
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
}

export interface ExternalRentalListResponse {
  items: ExternalRentalResponse[];
  meta: PaginationMeta;
}

export function toExternalRentalResponse(
  dto: ExternalRentalAgreementDto,
): ExternalRentalResponse {
  return {
    id: dto.id,
    agreementNumber: dto.agreementNumber,
    supplierId: dto.supplierId,
    warehouseId: dto.warehouseId,
    rentalOrderId: dto.rentalOrderId,
    status: dto.status,
    settlementStatus: dto.settlementStatus,
    hireStartDate: dto.hireStartDate,
    hireEndDate: dto.hireEndDate,
    expectedReturnToSupplierDate: dto.expectedReturnToSupplierDate,
    totalHireInCost: dto.totalHireInCost,
    amountDue: dto.amountDue,
    amountPaid: dto.amountPaid,
    outstandingBalance: dto.outstandingBalance,
    remarks: dto.remarks,
    createdById: dto.createdById,
    items: dto.items.map((item) => ({
      id: item.id,
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
      qtyWithCustomer: item.qtyWithCustomer,
      qtyInCompanyCustody: item.qtyInCompanyCustody,
      qtyOwedToSupplier: item.qtyOwedToSupplier,
    })),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toExternalRentalListResponse(
  result: PaginatedResult<ExternalRentalAgreementDto>,
): ExternalRentalListResponse {
  return {
    items: result.items.map(toExternalRentalResponse),
    meta: result.meta,
  };
}
