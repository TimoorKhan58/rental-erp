import { Prisma } from "@/generated/prisma/client";
import type { RentalInvoiceListQuery } from "@/modules/rental-invoice/domain/rental-invoice-list.query";
import type { RentalInvoicePaymentStatusFilter } from "@/modules/rental-invoice/domain/rental-invoice-list.query";
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

const MODEL = "RentalInvoice";

const DEFAULT_ORDER_BY = {
  createdAt: "desc" as const,
};

function mapPaymentStatusFilter(
  filter: RentalInvoicePaymentStatusFilter,
): import("@/generated/prisma/client").Prisma.RentalInvoiceWhereInput {
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

function mapRentalInvoiceFilter(
  filter: Record<string, unknown>,
): import("@/generated/prisma/client").Prisma.RentalInvoiceWhereInput | undefined {
  const where: import("@/generated/prisma/client").Prisma.RentalInvoiceWhereInput =
    {};

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
    }));
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
