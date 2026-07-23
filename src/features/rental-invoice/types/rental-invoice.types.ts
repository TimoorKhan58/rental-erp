import type { PaginationMeta } from "@/types/api";

export const RENTAL_INVOICE_STATUSES = [
  "DRAFT",
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
  "VOID",
] as const;

export type RentalInvoiceStatus = (typeof RENTAL_INVOICE_STATUSES)[number];

export const RENTAL_INVOICE_LINE_TYPES = [
  "RENTAL_CHARGE",
  "DELIVERY_CHARGE",
  "PICKUP_CHARGE",
  "DAMAGE_CHARGE",
  "LOST_ITEM_CHARGE",
  "REPAIR_CHARGE",
  "LABOUR_CHARGE",
  "MANUAL_CHARGE",
  "DISCOUNT",
  "TAX",
] as const;

export type RentalInvoiceLineType = (typeof RENTAL_INVOICE_LINE_TYPES)[number];

export type PaymentStatusFilter = "unpaid" | "partial" | "paid" | "void";

export type RentalInvoiceItemResponse = {
  id: string;
  lineType: RentalInvoiceLineType;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder: number;
  productName: string | null;
  dailyRate: number | null;
  numberOfDays: number | null;
  damagedQuantity: number;
  lostQuantity: number;
  missingQuantity: number;
  notes: string | null;
};

export type RentalInvoiceResponse = {
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
  status: RentalInvoiceStatus;
  notes: string | null;
  issuedAt: string | null;
  voidedAt: string | null;
  createdById: string;
  items: RentalInvoiceItemResponse[];
  createdAt: string;
  updatedAt: string;
};

export type RentalInvoiceListResponse = {
  items: RentalInvoiceResponse[];
  meta: PaginationMeta;
};

export type RentalInvoiceSortField =
  | "invoiceNumber"
  | "invoiceDate"
  | "dueDate"
  | "status"
  | "grandTotal"
  | "createdAt";

export type ListRentalInvoicesParams = {
  page?: number;
  pageSize?: number;
  sortBy?: RentalInvoiceSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: RentalInvoiceStatus;
  customerId?: string;
  rentalOrderId?: string;
};
