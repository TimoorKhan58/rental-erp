import type { PaymentListQuery } from "@/modules/payment/domain/payment-list.query";
import type { PaymentSummaryQuery } from "@/modules/payment/domain/payment-summary.query";
import type { PaymentSummaryResult } from "@/modules/payment/domain/payment-summary.types";
import { Prisma } from "@/generated/prisma/client";
import type { PaymentId, RentalInvoiceId } from "@/shared/domain/ids";
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
import { PAYMENT_METHODS, PAYMENT_SEARCH_FIELDS, PAYMENT_STATUSES } from "@/modules/payment/domain/payment.constants";

import {
  toPaymentCreateInput,
  toPaymentDomain,
  toPaymentStatusUpdateInput,
  toPaymentUpdateInput,
} from "../mappers/payment.persistence.mapper";
import {
  buildPaymentSummaryWhere,
  mapPaymentFilter,
  mergePaymentWhere,
} from "./payment-query.filters";

const MODEL = "Payment";

const DEFAULT_ORDER_BY = {
  createdAt: "desc" as const,
};

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

    if (query.paymentMethod !== undefined) {
      filter.paymentMethod = query.paymentMethod;
    }

    if (query.paymentDateFrom !== undefined) {
      filter.paymentDateFrom = query.paymentDateFrom;
    }

    if (query.paymentDateTo !== undefined) {
      filter.paymentDateTo = query.paymentDateTo;
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

  sumPendingAmountByRentalInvoiceId(
    rentalInvoiceId: RentalInvoiceId,
    excludePaymentId?: PaymentId,
  ): Promise<number> {
    return this.runner.run(
      async (db) => {
        const result = await db.payment.aggregate({
          where: {
            rentalInvoiceId,
            status: "PENDING",
            ...(excludePaymentId !== undefined
              ? { id: { not: excludePaymentId } }
              : {}),
          },
          _sum: { amount: true },
        });

        return Number(result._sum.amount ?? 0);
      },
      { model: MODEL, operation: "sumPendingAmountByRentalInvoiceId" },
    );
  }

  countPostedPaymentsByRentalInvoiceId(
    rentalInvoiceId: RentalInvoiceId,
  ): Promise<number> {
    return this.runner.run(
      async (db) =>
        db.payment.count({
          where: {
            rentalInvoiceId,
            status: "POSTED",
          },
        }),
      { model: MODEL, operation: "countPostedPaymentsByRentalInvoiceId" },
    );
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

  claimStatusTransition(
    id: PaymentId,
    expected: Payment["status"] | ReadonlyArray<Payment["status"]>,
    data: UpdatePaymentStatusData,
  ): Promise<Payment | null> {
    return this.runner.run(
      async (db) => {
        const update: Prisma.PaymentUpdateManyMutationInput = {
          status: data.status,
        };

        if (data.postedAt !== undefined) {
          update.postedAt = data.postedAt;
        }

        if (data.voidedAt !== undefined) {
          update.voidedAt = data.voidedAt;
        }

        const expectedList = Array.isArray(expected) ? [...expected] : [expected];

        const claimed = await db.payment.updateMany({
          where: {
            id,
            status: { in: expectedList },
          },
          data: update,
        });

        if (claimed.count !== 1) {
          return null;
        }

        const record = await db.payment.findUnique({ where: { id } });
        return record === null ? null : toPaymentDomain(record);
      },
      { model: MODEL, operation: "claimStatusTransition" },
    );
  }

  findSummaryStats(query: PaymentSummaryQuery): Promise<PaymentSummaryResult> {
    const where = buildPaymentSummaryWhere(query);

    return this.runner.run(
      async (db) => {
        const [
          totalPayments,
          statusGroups,
          methodGroups,
          postedSum,
          pendingSum,
          voidCount,
        ] = await Promise.all([
          db.payment.count({ where }),
          db.payment.groupBy({
            by: ["status"],
            where,
            _count: { _all: true },
          }),
          db.payment.groupBy({
            by: ["paymentMethod"],
            where,
            _count: { _all: true },
          }),
          db.payment.aggregate({
            where: mergePaymentWhere(where, { status: "POSTED" }),
            _sum: { amount: true },
          }),
          db.payment.aggregate({
            where: mergePaymentWhere(where, { status: "PENDING" }),
            _sum: { amount: true },
          }),
          db.payment.count({
            where: mergePaymentWhere(where, { status: "VOID" }),
          }),
        ]);

        const statusCounts: PaymentSummaryResult["statusCounts"] = {
          all: totalPayments,
          ...Object.fromEntries(PAYMENT_STATUSES.map((status) => [status, 0])),
        } as PaymentSummaryResult["statusCounts"];

        for (const group of statusGroups) {
          statusCounts[group.status] = group._count._all;
        }

        const methodCounts: PaymentSummaryResult["methodCounts"] = {
          all: totalPayments,
          ...Object.fromEntries(PAYMENT_METHODS.map((method) => [method, 0])),
        } as PaymentSummaryResult["methodCounts"];

        for (const group of methodGroups) {
          methodCounts[group.paymentMethod] = group._count._all;
        }

        return {
          stats: {
            totalPayments,
            activePayments: totalPayments - voidCount,
            pendingCount: statusCounts.PENDING,
            postedCount: statusCounts.POSTED,
            voidCount: statusCounts.VOID,
            totalCollected: Number(postedSum._sum.amount?.toString() ?? 0),
            totalPendingAmount: Number(pendingSum._sum.amount?.toString() ?? 0),
          },
          statusCounts,
          methodCounts,
        };
      },
      { model: MODEL, operation: "findSummaryStats" },
    );
  }
}
