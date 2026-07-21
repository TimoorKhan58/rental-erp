import { matchesPaymentStatusFilter } from "./rental-invoice-status.mapper";
import type {
  PaymentStatusFilter,
  RentalInvoiceResponse,
  RentalInvoiceStatus,
} from "../types";

export type RentalInvoiceSummaryStats = {
  totalInvoices: number;
  activeInvoices: number;
  outstandingCount: number;
  partiallyPaidCount: number;
  paidCount: number;
  draftCount: number;
  totalOutstanding: number;
  totalCollected: number;
};

export function computeRentalInvoiceSummary(
  invoices: RentalInvoiceResponse[],
): RentalInvoiceSummaryStats {
  let outstandingCount = 0;
  let partiallyPaidCount = 0;
  let paidCount = 0;
  let draftCount = 0;
  let voidCount = 0;
  let totalOutstanding = 0;
  let totalCollected = 0;

  for (const invoice of invoices) {
    totalCollected += invoice.paidAmount;

    switch (invoice.status) {
      case "DRAFT":
        draftCount += 1;
        break;
      case "PARTIALLY_PAID":
        partiallyPaidCount += 1;
        break;
      case "PAID":
        paidCount += 1;
        break;
      case "VOID":
        voidCount += 1;
        break;
      case "ISSUED":
        break;
    }

    if (invoice.status !== "VOID" && invoice.balance > 0) {
      outstandingCount += 1;
      totalOutstanding += invoice.balance;
    }
  }

  return {
    totalInvoices: invoices.length,
    activeInvoices: invoices.length - voidCount,
    outstandingCount,
    partiallyPaidCount,
    paidCount,
    draftCount,
    totalOutstanding,
    totalCollected,
  };
}

export function computeRentalInvoiceStatusCounts(
  invoices: RentalInvoiceResponse[],
): Partial<Record<"all" | RentalInvoiceStatus, number>> {
  const counts: Partial<Record<"all" | RentalInvoiceStatus, number>> = {
    all: invoices.length,
    DRAFT: 0,
    ISSUED: 0,
    PARTIALLY_PAID: 0,
    PAID: 0,
    VOID: 0,
  };

  for (const invoice of invoices) {
    counts[invoice.status] = (counts[invoice.status] ?? 0) + 1;
  }

  return counts;
}

export function computeRentalInvoicePaymentStatusCounts(
  invoices: RentalInvoiceResponse[],
): Partial<Record<"all" | PaymentStatusFilter, number>> {
  const filters: PaymentStatusFilter[] = ["unpaid", "partial", "paid", "void"];
  const counts: Partial<Record<"all" | PaymentStatusFilter, number>> = {
    all: invoices.length,
  };

  for (const filter of filters) {
    counts[filter] = invoices.filter((invoice) =>
      matchesPaymentStatusFilter(invoice, filter),
    ).length;
  }

  return counts;
}

const WORKFLOW_STEPS: RentalInvoiceStatus[] = [
  "DRAFT",
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
];

export function getRentalInvoiceWorkflowStep(status: RentalInvoiceStatus): number {
  if (status === "VOID") {
    return -1;
  }

  return WORKFLOW_STEPS.indexOf(status);
}

export function getRentalInvoiceWorkflowProgress(status: RentalInvoiceStatus): number {
  const step = getRentalInvoiceWorkflowStep(status);

  if (step < 0) {
    return 0;
  }

  return Math.round(((step + 1) / WORKFLOW_STEPS.length) * 100);
}

export function getRentalInvoicePaymentProgress(invoice: RentalInvoiceResponse): number {
  if (invoice.status === "VOID" || invoice.grandTotal <= 0) {
    return 0;
  }

  if (invoice.status === "PAID" || invoice.balance <= 0) {
    return 100;
  }

  return Math.min(100, Math.round((invoice.paidAmount / invoice.grandTotal) * 100));
}

export function getRentalInvoiceLineItemCount(invoice: RentalInvoiceResponse): number {
  return invoice.items.length;
}
