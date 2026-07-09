export const RENTAL_INVOICE_MODULE = "rental-invoices";
export const RENTAL_INVOICE_ENTITY_NAME = "RentalInvoice";

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
  "MANUAL_CHARGE",
  "DISCOUNT",
  "TAX",
] as const;

export type RentalInvoiceLineType = (typeof RENTAL_INVOICE_LINE_TYPES)[number];

export const ELIGIBLE_RENTAL_ORDER_INVOICE_STATUS = "COMPLETED" as const;

export const RENTAL_INVOICE_SEARCH_FIELDS = [
  "invoiceNumber",
  "notes",
] as const;

export const RENTAL_INVOICE_SORT_FIELDS = [
  "invoiceNumber",
  "invoiceDate",
  "dueDate",
  "status",
  "grandTotal",
  "createdAt",
] as const;

export type RentalInvoiceSortField = (typeof RENTAL_INVOICE_SORT_FIELDS)[number];
