import type { RentalInvoice } from "./rental-invoice.entity";
import type { RentalInvoicePaymentStatusFilter } from "./rental-invoice-list.query";
import type { RentalInvoiceSummaryQuery } from "./rental-invoice-summary.query";
import type {
  RentalInvoiceSummaryPaymentStatusCounts,
  RentalInvoiceSummaryResult,
  RentalInvoiceSummaryStats,
  RentalInvoiceSummaryStatusCounts,
} from "./rental-invoice-summary.types";

export function matchesRentalInvoicePaymentStatus(
  invoice: RentalInvoice,
  filter: RentalInvoicePaymentStatusFilter,
): boolean {
  if (filter === "void") {
    return invoice.status === "VOID";
  }

  if (filter === "paid") {
    return (
      invoice.status === "PAID" ||
      (invoice.status !== "VOID" && invoice.balance <= 0)
    );
  }

  if (filter === "partial") {
    return (
      invoice.status === "PARTIALLY_PAID" ||
      (invoice.paidAmount > 0 && invoice.balance > 0 && invoice.status !== "VOID")
    );
  }

  return invoice.status === "ISSUED" || (invoice.status === "DRAFT" && invoice.paidAmount === 0);
}

export function matchesRentalInvoiceSummaryQuery(
  invoice: RentalInvoice,
  query: RentalInvoiceSummaryQuery,
): boolean {
  if (query.status !== undefined && invoice.status !== query.status) {
    return false;
  }

  if (query.customerId !== undefined && invoice.customerId !== query.customerId) {
    return false;
  }

  if (query.rentalOrderId !== undefined && invoice.rentalOrderId !== query.rentalOrderId) {
    return false;
  }

  if (query.paymentStatus !== undefined) {
    if (!matchesRentalInvoicePaymentStatus(invoice, query.paymentStatus)) {
      return false;
    }
  }

  if (query.invoiceDateFrom !== undefined) {
    if (invoice.invoiceDate.getTime() < query.invoiceDateFrom.getTime()) {
      return false;
    }
  }

  if (query.invoiceDateTo !== undefined) {
    const end = new Date(query.invoiceDateTo);
    end.setHours(23, 59, 59, 999);

    if (invoice.invoiceDate.getTime() > end.getTime()) {
      return false;
    }
  }

  if (query.search !== undefined) {
    const term = query.search.toLowerCase();
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(term) ||
      (invoice.notes?.toLowerCase().includes(term) ?? false);

    if (!matchesSearch) {
      return false;
    }
  }

  return true;
}

export function filterRentalInvoicesForSummary(
  invoices: RentalInvoice[],
  query: RentalInvoiceSummaryQuery,
): RentalInvoice[] {
  return invoices.filter((invoice) => matchesRentalInvoiceSummaryQuery(invoice, query));
}

const PAYMENT_STATUS_FILTERS: RentalInvoicePaymentStatusFilter[] = [
  "unpaid",
  "partial",
  "paid",
  "void",
];

export function computeRentalInvoiceSummaryResult(
  invoices: RentalInvoice[],
): RentalInvoiceSummaryResult {
  let outstandingCount = 0;
  let partiallyPaidCount = 0;
  let paidCount = 0;
  let draftCount = 0;
  let voidCount = 0;
  let totalOutstanding = 0;
  let totalCollected = 0;

  const statusCounts: RentalInvoiceSummaryStatusCounts = {
    all: invoices.length,
    DRAFT: 0,
    ISSUED: 0,
    PARTIALLY_PAID: 0,
    PAID: 0,
    VOID: 0,
  };

  const paymentStatusCounts: RentalInvoiceSummaryPaymentStatusCounts = {
    all: invoices.length,
    unpaid: 0,
    partial: 0,
    paid: 0,
    void: 0,
  };

  for (const invoice of invoices) {
    totalCollected += invoice.paidAmount;
    statusCounts[invoice.status] += 1;

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

  for (const filter of PAYMENT_STATUS_FILTERS) {
    paymentStatusCounts[filter] = invoices.filter((invoice) =>
      matchesRentalInvoicePaymentStatus(invoice, filter),
    ).length;
  }

  const stats: RentalInvoiceSummaryStats = {
    totalInvoices: invoices.length,
    activeInvoices: invoices.length - voidCount,
    outstandingCount,
    partiallyPaidCount,
    paidCount,
    draftCount,
    totalOutstanding,
    totalCollected,
  };

  return {
    stats,
    statusCounts,
    paymentStatusCounts,
  };
}
