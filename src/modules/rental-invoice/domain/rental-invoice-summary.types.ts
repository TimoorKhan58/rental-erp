import type { RentalInvoiceStatus } from "./rental-invoice.constants";
import type { RentalInvoicePaymentStatusFilter } from "./rental-invoice-list.query";

export interface RentalInvoiceSummaryStats {
  totalInvoices: number;
  activeInvoices: number;
  outstandingCount: number;
  partiallyPaidCount: number;
  paidCount: number;
  draftCount: number;
  totalOutstanding: number;
  totalCollected: number;
}

export type RentalInvoiceSummaryStatusCounts = Record<
  "all" | RentalInvoiceStatus,
  number
>;

export type RentalInvoiceSummaryPaymentStatusCounts = Record<
  "all" | RentalInvoicePaymentStatusFilter,
  number
>;

export interface RentalInvoiceSummaryResult {
  stats: RentalInvoiceSummaryStats;
  statusCounts: RentalInvoiceSummaryStatusCounts;
  paymentStatusCounts: RentalInvoiceSummaryPaymentStatusCounts;
}
