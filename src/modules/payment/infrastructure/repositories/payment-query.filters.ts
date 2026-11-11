import type { Prisma } from "@/generated/prisma/client";

import type { Payment } from "@/modules/payment/domain/payment.entity";
import type { PaymentSummaryQuery } from "@/modules/payment/domain/payment-summary.query";
import { PAYMENT_SEARCH_FIELDS } from "@/modules/payment/domain/payment.constants";
import { buildSearchWhereFromInput } from "@/shared/infrastructure/database/repository/query/build-search";
import { mergePrismaWhere } from "@/shared/infrastructure/database/repository/query/merge-prisma-where";

export function mapPaymentFilter(
  filter: Record<string, unknown>,
): Prisma.PaymentWhereInput | undefined {
  const where: Prisma.PaymentWhereInput = {};

  if (filter.status !== undefined) {
    where.status = filter.status as Payment["status"];
  }

  if (filter.customerId !== undefined) {
    where.customerId = String(filter.customerId);
  }

  if (filter.rentalInvoiceId !== undefined) {
    where.rentalInvoiceId = String(filter.rentalInvoiceId);
  }

  if (filter.paymentMethod !== undefined) {
    where.paymentMethod = filter.paymentMethod as Payment["paymentMethod"];
  }

  if (filter.paymentDateFrom !== undefined || filter.paymentDateTo !== undefined) {
    where.paymentDate = {};

    if (filter.paymentDateFrom !== undefined) {
      where.paymentDate.gte = filter.paymentDateFrom as Date;
    }

    if (filter.paymentDateTo !== undefined) {
      const end = new Date(filter.paymentDateTo as Date);
      end.setHours(23, 59, 59, 999);
      where.paymentDate.lte = end;
    }
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

export function toPaymentFilterRecord(
  query: PaymentSummaryQuery,
): Record<string, unknown> | undefined {
  const filter: Record<string, unknown> = {};

  if (query.status !== undefined) {
    filter.status = query.status;
  }

  if (query.customerId !== undefined) {
    filter.customerId = query.customerId;
  }

  if (query.rentalInvoiceId !== undefined) {
    filter.rentalInvoiceId = query.rentalInvoiceId;
  }

  if (query.paymentMethod !== undefined) {
    filter.paymentMethod = query.paymentMethod;
  }

  if (query.paymentDateFrom !== undefined) {
    filter.paymentDateFrom = query.paymentDateFrom;
  }

  if (query.paymentDateTo !== undefined) {
    filter.paymentDateTo = query.paymentDateTo;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

export function buildPaymentSummaryWhere(
  query: PaymentSummaryQuery,
): Prisma.PaymentWhereInput | undefined {
  const filterRecord = toPaymentFilterRecord(query);
  const filterWhere = filterRecord ? mapPaymentFilter(filterRecord) : undefined;
  const searchWhere = buildSearchWhereFromInput<Prisma.PaymentWhereInput>(
    query.search !== undefined && query.search.trim().length > 0
      ? { term: query.search.trim(), fields: PAYMENT_SEARCH_FIELDS }
      : undefined,
    PAYMENT_SEARCH_FIELDS,
  );

  return mergePrismaWhere(filterWhere, searchWhere);
}

export function mergePaymentWhere(
  base: Prisma.PaymentWhereInput | undefined,
  extra: Prisma.PaymentWhereInput,
): Prisma.PaymentWhereInput {
  return mergePrismaWhere(base, extra) ?? extra;
}
