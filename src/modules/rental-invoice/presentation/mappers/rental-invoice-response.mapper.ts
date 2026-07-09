import type { RentalInvoiceDto } from "@/modules/rental-invoice/application/dtos/rental-invoice.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface RentalInvoiceItemResponse {
  id: string;
  lineType: RentalInvoiceDto["items"][number]["lineType"];
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder: number;
}

export interface RentalInvoiceResponse {
  id: string;
  invoiceNumber: string;
  rentalOrderId: string;
  customerId: string;
  invoiceDate: string;
  dueDate: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paidAmount: number;
  balance: number;
  status: RentalInvoiceDto["status"];
  notes: string | null;
  issuedAt: string | null;
  voidedAt: string | null;
  createdById: string;
  items: RentalInvoiceItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface RentalInvoiceListResponse {
  items: RentalInvoiceResponse[];
  meta: PaginationMeta;
}

export function toRentalInvoiceResponse(
  dto: RentalInvoiceDto,
): RentalInvoiceResponse {
  return {
    id: dto.id,
    invoiceNumber: dto.invoiceNumber,
    rentalOrderId: dto.rentalOrderId,
    customerId: dto.customerId,
    invoiceDate: dto.invoiceDate,
    dueDate: dto.dueDate,
    subtotal: dto.subtotal,
    discount: dto.discount,
    tax: dto.tax,
    grandTotal: dto.grandTotal,
    paidAmount: dto.paidAmount,
    balance: dto.balance,
    status: dto.status,
    notes: dto.notes,
    issuedAt: dto.issuedAt,
    voidedAt: dto.voidedAt,
    createdById: dto.createdById,
    items: dto.items.map((item) => ({
      id: item.id,
      lineType: item.lineType,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      sortOrder: item.sortOrder,
    })),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toRentalInvoiceListResponse(
  result: PaginatedResult<RentalInvoiceDto>,
): RentalInvoiceListResponse {
  return {
    items: result.items.map(toRentalInvoiceResponse),
    meta: result.meta,
  };
}
