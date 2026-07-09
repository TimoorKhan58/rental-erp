import type { PaymentListQuery } from "@/modules/payment/domain/payment-list.query";
import type { PaymentId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryCreate,
  repositoryFindFirst,
  repositoryUpdate,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import { Payment } from "@/modules/payment/domain/payment.entity";
import type { IPaymentRepository } from "@/modules/payment/domain/payment.repository.interface";
import type {
  CreatePaymentData,
  UpdatePaymentData,
  UpdatePaymentStatusData,
} from "@/modules/payment/domain/payment.types";
import { PAYMENT_SEARCH_FIELDS } from "@/modules/payment/domain/payment.constants";

import {
  toPaymentCreateInput,
  toPaymentDomain,
  toPaymentStatusUpdateInput,
  toPaymentUpdateInput,
} from "../mappers/payment.persistence.mapper";

const MODEL = "Payment";

const DEFAULT_ORDER_BY = {
  createdAt: "desc" as const,
};

function mapPaymentFilter(
  filter: Record<string, unknown>,
): import("@/generated/prisma/client").Prisma.PaymentWhereInput | undefined {
  const where: import("@/generated/prisma/client").Prisma.PaymentWhereInput = {};

  if (filter.status !== undefined) {
    where.status = filter.status as Payment["status"];
  }

  if (filter.customerId !== undefined) {
    where.customerId = String(filter.customerId);
  }

  if (filter.rentalInvoiceId !== undefined) {
    where.rentalInvoiceId = String(filter.rentalInvoiceId);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapPaymentSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): import("@/generated/prisma/client").Prisma.PaymentOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as import("@/generated/prisma/client").Prisma.PaymentOrderByWithRelationInput;
}

export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: PaymentId): Promise<Payment | null> {
    return repositoryFindFirst(
      this.runner,
      (db) => db.payment.findUnique({ where: { id } }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toPaymentDomain(record) : null));
  }

  findByPaymentNumber(paymentNumber: string): Promise<Payment | null> {
    return repositoryFindFirst(
      this.runner,
      (db) => db.payment.findUnique({ where: { paymentNumber } }),
      { model: MODEL, operation: "findByPaymentNumber" },
    ).then((record) => (record ? toPaymentDomain(record) : null));
  }

  findPaged(query: PaymentListQuery): Promise<PaginatedResult<Payment>> {
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

    return runRepositoryPagedQuery(
      this.runner,
      {
        spec: createRepositoryQuerySpec({
          page: query.page,
          pageSize: query.pageSize,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
          search: query.search,
          searchFields: PAYMENT_SEARCH_FIELDS,
        }),
        searchFields: PAYMENT_SEARCH_FIELDS,
        mapFilter: mapPaymentFilter,
        mapSort: mapPaymentSort,
        handlers: {
          findMany: (db, args) =>
            db.payment.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
            }),
          count: (db, args) =>
            db.payment.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    ).then((result) => ({
      items: result.items.map(toPaymentDomain),
      meta: result.meta,
    }));
  }

  create(data: CreatePaymentData): Promise<Payment> {
    return repositoryCreate(
      this.runner,
      (db) =>
        db.payment.create({
          data: toPaymentCreateInput(data),
        }),
      { model: MODEL, operation: "create" },
    ).then(toPaymentDomain);
  }

  async update(id: PaymentId, data: UpdatePaymentData): Promise<Payment> {
    const existing = await this.findById(id);

    if (existing === null) {
      throw new Error(`Payment not found: ${id}`);
    }

    return repositoryUpdate(
      this.runner,
      (db) =>
        db.payment.update({
          where: { id },
          data: toPaymentUpdateInput(data, existing),
        }),
      { model: MODEL, operation: "update" },
    ).then(toPaymentDomain);
  }

  updateStatus(
    id: PaymentId,
    data: UpdatePaymentStatusData,
  ): Promise<Payment> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.payment.update({
          where: { id },
          data: toPaymentStatusUpdateInput(data),
        }),
      { model: MODEL, operation: "updateStatus" },
    ).then(toPaymentDomain);
  }
}
