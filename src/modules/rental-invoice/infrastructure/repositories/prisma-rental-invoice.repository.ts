import type { RentalInvoiceListQuery } from "@/modules/rental-invoice/domain/rental-invoice-list.query";
import type { RentalInvoiceId } from "@/shared/domain/ids";
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

function mapRentalInvoiceFilter(
  filter: Record<string, unknown>,
): import("@/generated/prisma/client").Prisma.RentalInvoiceWhereInput | undefined {
  const where: import("@/generated/prisma/client").Prisma.RentalInvoiceWhereInput =
    {};

  if (filter.status !== undefined) {
    where.status = filter.status as RentalInvoice["status"];
  }

  if (filter.customerId !== undefined) {
    where.customerId = String(filter.customerId);
  }

  if (filter.rentalOrderId !== undefined) {
    where.rentalOrderId = String(filter.rentalOrderId);
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
}
