import type { Prisma } from "@/generated/prisma/client";

import type { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";
import type { RentalInvoicePaymentStatusFilter } from "@/modules/rental-invoice/domain/rental-invoice-list.query";
import type { RentalInvoiceSummaryQuery } from "@/modules/rental-invoice/domain/rental-invoice-summary.query";
import { RENTAL_INVOICE_SEARCH_FIELDS } from "@/modules/rental-invoice/domain/rental-invoice.constants";
import { buildSearchWhereFromInput } from "@/shared/infrastructure/database/repository/query/build-search";
import { mergePrismaWhere } from "@/shared/infrastructure/database/repository/query/merge-prisma-where";

export function mapPaymentStatusFilter(
  filter: RentalInvoicePaymentStatusFilter,
): Prisma.RentalInvoiceWhereInput {
  switch (filter) {
    case "void":
      return { status: "VOID" };
    case "paid":
      return {
        OR: [
          { status: "PAID" },
          {
            AND: [{ status: { not: "VOID" } }, { balance: { lte: 0 } }],
          },
        ],
      };
    case "partial":
      return {
        OR: [
          { status: "PARTIALLY_PAID" },
          {
            AND: [
              { paidAmount: { gt: 0 } },
              { balance: { gt: 0 } },
              { status: { not: "VOID" } },
            ],
          },
        ],
      };
    case "unpaid":
      return {
        OR: [
          { status: "ISSUED" },
          {
            AND: [{ status: "DRAFT" }, { paidAmount: 0 }],
          },
        ],
      };
  }
}

export function mapRentalInvoiceFilter(
  filter: Record<string, unknown>,
): Prisma.RentalInvoiceWhereInput | undefined {
  const where: Prisma.RentalInvoiceWhereInput = {};

  if (filter.status !== undefined) {
    where.status = filter.status as RentalInvoice["status"];
  }

  if (filter.paymentStatus !== undefined) {
    Object.assign(
      where,
      mapPaymentStatusFilter(filter.paymentStatus as RentalInvoicePaymentStatusFilter),
    );
  }

  if (filter.customerId !== undefined) {
    where.customerId = String(filter.customerId);
  }

  if (filter.rentalOrderId !== undefined) {
    where.rentalOrderId = String(filter.rentalOrderId);
  }

  if (filter.invoiceDateFrom !== undefined || filter.invoiceDateTo !== undefined) {
    where.invoiceDate = {};

    if (filter.invoiceDateFrom !== undefined) {
      where.invoiceDate.gte = filter.invoiceDateFrom as Date;
    }

    if (filter.invoiceDateTo !== undefined) {
      const end = new Date(filter.invoiceDateTo as Date);
      end.setHours(23, 59, 59, 999);
      where.invoiceDate.lte = end;
    }
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

export function toRentalInvoiceFilterRecord(
  query: RentalInvoiceSummaryQuery,
): Record<string, unknown> | undefined {
  const filter: Record<string, unknown> = {};

  if (query.status !== undefined) {
    filter.status = query.status;
  }

  if (query.customerId !== undefined) {
    filter.customerId = query.customerId;
  }

  if (query.rentalOrderId !== undefined) {
    filter.rentalOrderId = query.rentalOrderId;
  }

  if (query.paymentStatus !== undefined) {
    filter.paymentStatus = query.paymentStatus;
  }

  if (query.invoiceDateFrom !== undefined) {
    filter.invoiceDateFrom = query.invoiceDateFrom;
  }

  if (query.invoiceDateTo !== undefined) {
    filter.invoiceDateTo = query.invoiceDateTo;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

export function buildRentalInvoiceSummaryWhere(
  query: RentalInvoiceSummaryQuery,
): Prisma.RentalInvoiceWhereInput | undefined {
  const filterRecord = toRentalInvoiceFilterRecord(query);
  const filterWhere = filterRecord ? mapRentalInvoiceFilter(filterRecord) : undefined;
  const searchWhere = buildSearchWhereFromInput<Prisma.RentalInvoiceWhereInput>(
    query.search !== undefined && query.search.trim().length > 0
      ? { term: query.search.trim(), fields: RENTAL_INVOICE_SEARCH_FIELDS }
      : undefined,
    RENTAL_INVOICE_SEARCH_FIELDS,
  );

  return mergePrismaWhere(filterWhere, searchWhere);
}

export function mergeRentalInvoiceWhere(
  base: Prisma.RentalInvoiceWhereInput | undefined,
  extra: Prisma.RentalInvoiceWhereInput,
): Prisma.RentalInvoiceWhereInput {
  return mergePrismaWhere(base, extra) ?? extra;
}
