import { Prisma } from "@/generated/prisma/client";
import type { RentalInvoiceListQuery } from "@/modules/rental-invoice/domain/rental-invoice-list.query";
import type { RentalInvoiceSummaryQuery } from "@/modules/rental-invoice/domain/rental-invoice-summary.query";
import type { RentalInvoiceSummaryResult } from "@/modules/rental-invoice/domain/rental-invoice-summary.types";
import type { RentalInvoiceId, RentalOrderId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryCreate,
  repositoryFindFirst,
  repositoryUpdate,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";
import type { IRentalInvoiceRepository } from "@/modules/rental-invoice/domain/rental-invoice.repository.interface";
import type {
  CreateRentalInvoiceData,
  UpdateRentalInvoiceData,
  UpdateRentalInvoiceStatusData,
} from "@/modules/rental-invoice/domain/rental-invoice.types";
import { RENTAL_INVOICE_SEARCH_FIELDS } from "@/modules/rental-invoice/domain/rental-invoice.constants";

import {
  RENTAL_INVOICE_INCLUDE,
  toRentalInvoiceCreateInput,
  toRentalInvoiceDomain,
  toRentalInvoiceStatusUpdateInput,
  toRentalInvoiceUpdateInput,
} from "../mappers/rental-invoice.persistence.mapper";
import {
  buildRentalInvoiceSummaryWhere,
  mapPaymentStatusFilter,
  mapRentalInvoiceFilter,
  mergeRentalInvoiceWhere,
} from "./rental-invoice-query.filters";

const MODEL = "RentalInvoice";

const DEFAULT_ORDER_BY = {
  createdAt: "desc" as const,
};

function mapRentalInvoiceSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): import("@/generated/prisma/client").Prisma.RentalInvoiceOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as import("@/generated/prisma/client").Prisma.RentalInvoiceOrderByWithRelationInput;
}

export class PrismaRentalInvoiceRepository implements IRentalInvoiceRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: RentalInvoiceId): Promise<RentalInvoice | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.rentalInvoice.findUnique({
          where: { id },
          include: RENTAL_INVOICE_INCLUDE,
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toRentalInvoiceDomain(record) : null));
  }

  findByInvoiceNumber(invoiceNumber: string): Promise<RentalInvoice | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.rentalInvoice.findUnique({
          where: { invoiceNumber },
          include: RENTAL_INVOICE_INCLUDE,
        }),
      { model: MODEL, operation: "findByInvoiceNumber" },
    ).then((record) => (record ? toRentalInvoiceDomain(record) : null));
  }

  findActiveByRentalOrderId(
    rentalOrderId: RentalOrderId,
  ): Promise<RentalInvoice | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.rentalInvoice.findFirst({
          where: {
            rentalOrderId,
            status: { not: "VOID" },
          },
          orderBy: { createdAt: "desc" },
          include: RENTAL_INVOICE_INCLUDE,
        }),
      { model: MODEL, operation: "findActiveByRentalOrderId" },
    ).then((record) => (record ? toRentalInvoiceDomain(record) : null));
  }

  findMaxSequenceForInvoicePrefix(prefix: string): Promise<number> {
    return this.runner.run(
      async (db) => {
        const prefixLength = prefix.length;
        const rows = await db.$queryRaw<Array<{ max: number | null }>>`
          SELECT COALESCE(
            MAX(
              CAST(SUBSTRING("invoiceNumber" FROM ${prefixLength + 1}) AS INTEGER)
            ),
            0
          ) AS max
          FROM "rental_invoices"
          WHERE "invoiceNumber" LIKE ${`${prefix}%`}
            AND SUBSTRING("invoiceNumber" FROM ${prefixLength + 1}) ~ '^[0-9]+$'
        `;

        const value = rows[0]?.max;
        return value === null || value === undefined ? 0 : Number(value);
      },
      { model: MODEL, operation: "findMaxSequenceForInvoicePrefix" },
    );
  }

  findPaged(
    query: RentalInvoiceListQuery,
  ): Promise<PaginatedResult<RentalInvoice>> {
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
          searchFields: RENTAL_INVOICE_SEARCH_FIELDS,
        }),
        searchFields: RENTAL_INVOICE_SEARCH_FIELDS,
        mapFilter: mapRentalInvoiceFilter,
        mapSort: mapRentalInvoiceSort,
        handlers: {
          findMany: (db, args) =>
            db.rentalInvoice.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
              include: RENTAL_INVOICE_INCLUDE,
            }),
          count: (db, args) =>
            db.rentalInvoice.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    ).then((result) => ({
      items: result.items.map(toRentalInvoiceDomain),
      meta: result.meta,
    }    ));
  }

  findSummaryStats(
    query: RentalInvoiceSummaryQuery,
  ): Promise<RentalInvoiceSummaryResult> {
    const where = buildRentalInvoiceSummaryWhere(query);

    return this.runner.run(
      async (db) => {
        const [
          totalInvoices,
          statusGroups,
          totalCollectedAgg,
          outstandingAgg,
          unpaidCount,
          partialCount,
          paidCount,
          voidCount,
        ] = await Promise.all([
          db.rentalInvoice.count({ where }),
          db.rentalInvoice.groupBy({
            by: ["status"],
            where,
            _count: { _all: true },
          }),
          db.rentalInvoice.aggregate({
            where,
            _sum: { paidAmount: true },
          }),
          db.rentalInvoice.aggregate({
            where: mergeRentalInvoiceWhere(where, {
              status: { not: "VOID" },
              balance: { gt: 0 },
            }),
            _sum: { balance: true },
            _count: { _all: true },
          }),
          db.rentalInvoice.count({
            where: mergeRentalInvoiceWhere(where, mapPaymentStatusFilter("unpaid")),
          }),
          db.rentalInvoice.count({
            where: mergeRentalInvoiceWhere(where, mapPaymentStatusFilter("partial")),
          }),
          db.rentalInvoice.count({
            where: mergeRentalInvoiceWhere(where, mapPaymentStatusFilter("paid")),
          }),
          db.rentalInvoice.count({
            where: mergeRentalInvoiceWhere(where, mapPaymentStatusFilter("void")),
          }),
        ]);

        const statusCounts: RentalInvoiceSummaryResult["statusCounts"] = {
          all: totalInvoices,
          DRAFT: 0,
          ISSUED: 0,
          PARTIALLY_PAID: 0,
          PAID: 0,
          VOID: 0,
        };

        for (const group of statusGroups) {
          statusCounts[group.status] = group._count._all;
        }

        return {
          stats: {
            totalInvoices,
            activeInvoices: totalInvoices - statusCounts.VOID,
            outstandingCount: outstandingAgg._count._all ?? 0,
            partiallyPaidCount: statusCounts.PARTIALLY_PAID,
            paidCount: statusCounts.PAID,
            draftCount: statusCounts.DRAFT,
            totalOutstanding: Number(outstandingAgg._sum.balance ?? 0),
            totalCollected: Number(totalCollectedAgg._sum.paidAmount ?? 0),
          },
          statusCounts,
          paymentStatusCounts: {
            all: totalInvoices,
            unpaid: unpaidCount,
            partial: partialCount,
            paid: paidCount,
            void: voidCount,
          },
        };
      },
      { model: MODEL, operation: "findSummaryStats" },
    );
  }

  create(data: CreateRentalInvoiceData): Promise<RentalInvoice> {
    return repositoryCreate(
      this.runner,
      (db) =>
        db.rentalInvoice.create({
          data: toRentalInvoiceCreateInput(data),
          include: RENTAL_INVOICE_INCLUDE,
        }),
      { model: MODEL, operation: "create" },
    ).then(toRentalInvoiceDomain);
  }

  async update(
    id: RentalInvoiceId,
    data: UpdateRentalInvoiceData,
  ): Promise<RentalInvoice> {
    const existing = await this.findById(id);

    if (existing === null) {
      throw new Error(`Rental invoice not found: ${id}`);
    }

    return repositoryUpdate(
      this.runner,
      (db) =>
        db.rentalInvoice.update({
          where: { id },
          data: toRentalInvoiceUpdateInput(data, existing),
          include: RENTAL_INVOICE_INCLUDE,
        }),
      { model: MODEL, operation: "update" },
    ).then(toRentalInvoiceDomain);
  }

  updateStatus(
    id: RentalInvoiceId,
    data: UpdateRentalInvoiceStatusData,
  ): Promise<RentalInvoice> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.rentalInvoice.update({
          where: { id },
          data: toRentalInvoiceStatusUpdateInput(data),
          include: RENTAL_INVOICE_INCLUDE,
        }),
      { model: MODEL, operation: "updateStatus" },
    ).then(toRentalInvoiceDomain);
  }

  claimStatusTransition(
    id: RentalInvoiceId,
    expected: RentalInvoice["status"] | ReadonlyArray<RentalInvoice["status"]>,
    data: UpdateRentalInvoiceStatusData,
  ): Promise<RentalInvoice | null> {
    return this.runner.run(
      async (db) => {
        const update = toRentalInvoiceStatusUpdateInput(data);
        const expectedList = Array.isArray(expected) ? [...expected] : [expected];

        const claimed = await db.rentalInvoice.updateMany({
          where: {
            id,
            status: { in: expectedList },
          },
          data: update,
        });

        if (claimed.count !== 1) {
          return null;
        }

        const record = await db.rentalInvoice.findUnique({
          where: { id },
          include: RENTAL_INVOICE_INCLUDE,
        });

        return record === null ? null : toRentalInvoiceDomain(record);
      },
      { model: MODEL, operation: "claimStatusTransition" },
    );
  }

  applyPaymentDelta(
    id: RentalInvoiceId,
    delta: number,
  ): Promise<RentalInvoice | null> {
    return this.runner.run(
      async (db) => {
        if (delta === 0) {
          return null;
        }

        const decimalDelta = new Prisma.Decimal(delta);

        if (delta > 0) {
          const rows = await db.$queryRaw<Array<{ id: string }>>`
            UPDATE "rental_invoices"
            SET
              "paidAmount" = "paidAmount" + ${decimalDelta},
              "balance" = "balance" - ${decimalDelta},
              "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = ${id}::uuid
              AND "status" IN ('ISSUED', 'PARTIALLY_PAID', 'PAID')
              AND "paidAmount" + ${decimalDelta} <= "grandTotal"
              AND ${decimalDelta} > 0
            RETURNING "id"
          `;

          if (rows.length === 0) {
            return null;
          }
        } else {
          const absDelta = new Prisma.Decimal(-delta);

          const rows = await db.$queryRaw<Array<{ id: string }>>`
            UPDATE "rental_invoices"
            SET
              "paidAmount" = "paidAmount" + ${decimalDelta},
              "balance" = "balance" - ${decimalDelta},
              "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = ${id}::uuid
              AND "status" NOT IN ('DRAFT', 'VOID')
              AND "paidAmount" + ${decimalDelta} >= 0
              AND ${absDelta} > 0
            RETURNING "id"
          `;

          if (rows.length === 0) {
            return null;
          }
        }

        const record = await db.rentalInvoice.findUnique({
          where: { id },
          include: RENTAL_INVOICE_INCLUDE,
        });

        return record === null ? null : toRentalInvoiceDomain(record);
      },
      { model: MODEL, operation: "applyPaymentDelta" },
    );
  }

  lockForPaymentCommitment(id: RentalInvoiceId): Promise<void> {
    return this.runner.run(
      async (db) => {
        const rows = await db.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "rental_invoices" WHERE id = ${id}::uuid FOR UPDATE
        `;

        if (rows.length === 0) {
          throw new Error("Rental invoice not found");
        }
      },
      { model: MODEL, operation: "lockForPaymentCommitment" },
    );
  }
}
