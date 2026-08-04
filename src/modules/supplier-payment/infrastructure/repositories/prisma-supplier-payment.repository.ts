import type { SupplierPaymentListQuery } from "@/modules/supplier-payment/domain/supplier-payment-list.query";
import type { SupplierPaymentId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryCreate,
  repositoryFindFirst,
  repositoryUpdate,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import { SupplierPayment } from "@/modules/supplier-payment/domain/supplier-payment.entity";
import type { ISupplierPaymentRepository } from "@/modules/supplier-payment/domain/supplier-payment.repository.interface";
import type {
  CreateSupplierPaymentData,
  UpdateSupplierPaymentStatusData,
} from "@/modules/supplier-payment/domain/supplier-payment.types";
import { SUPPLIER_PAYMENT_SEARCH_FIELDS } from "@/modules/supplier-payment/domain/supplier-payment.constants";

import {
  toSupplierPaymentCreateInput,
  toSupplierPaymentDomain,
  toSupplierPaymentStatusUpdateInput,
} from "../mappers/supplier-payment.persistence.mapper";

const MODEL = "SupplierPayment";

const DEFAULT_ORDER_BY = {
  createdAt: "desc" as const,
};

function mapSupplierPaymentFilter(
  filter: Record<string, unknown>,
):
  | import("@/generated/prisma/client").Prisma.SupplierPaymentWhereInput
  | undefined {
  const where: import("@/generated/prisma/client").Prisma.SupplierPaymentWhereInput =
    {};

  if (filter.status !== undefined) {
    where.status = filter.status as SupplierPayment["status"];
  }

  if (filter.supplierId !== undefined) {
    where.supplierId = String(filter.supplierId);
  }

  if (filter.purchaseOrderId !== undefined) {
    where.purchaseOrderId = String(filter.purchaseOrderId);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapSupplierPaymentSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): import("@/generated/prisma/client").Prisma.SupplierPaymentOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as import("@/generated/prisma/client").Prisma.SupplierPaymentOrderByWithRelationInput;
}

export class PrismaSupplierPaymentRepository
  implements ISupplierPaymentRepository
{
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: SupplierPaymentId): Promise<SupplierPayment | null> {
    return repositoryFindFirst(
      this.runner,
      (db) => db.supplierPayment.findUnique({ where: { id } }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toSupplierPaymentDomain(record) : null));
  }

  findByPaymentNumber(paymentNumber: string): Promise<SupplierPayment | null> {
    return repositoryFindFirst(
      this.runner,
      (db) => db.supplierPayment.findUnique({ where: { paymentNumber } }),
      { model: MODEL, operation: "findByPaymentNumber" },
    ).then((record) => (record ? toSupplierPaymentDomain(record) : null));
  }

  findPaged(
    query: SupplierPaymentListQuery,
  ): Promise<PaginatedResult<SupplierPayment>> {
    const filter: Record<string, unknown> = {};

    if (query.status !== undefined) {
      filter.status = query.status;
    }

    if (query.supplierId !== undefined) {
      filter.supplierId = query.supplierId;
    }

    if (query.purchaseOrderId !== undefined) {
      filter.purchaseOrderId = query.purchaseOrderId;
    }

    return runRepositoryPagedQuery(this.runner, {
      spec: createRepositoryQuerySpec({
        page: query.page,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        search: query.search,
        searchFields: SUPPLIER_PAYMENT_SEARCH_FIELDS,
      }),
      searchFields: SUPPLIER_PAYMENT_SEARCH_FIELDS,
      mapFilter: mapSupplierPaymentFilter,
      mapSort: mapSupplierPaymentSort,
      handlers: {
        findMany: (db, args) =>
          db.supplierPayment.findMany({
            where: args.where,
            orderBy: args.orderBy,
            skip: args.skip,
            take: args.take,
          }),
        count: (db, args) =>
          db.supplierPayment.count({
            where: args.where,
          }),
      },
      meta: { model: MODEL, operation: "findPaged" },
    }).then((result) => ({
      items: result.items.map(toSupplierPaymentDomain),
      meta: result.meta,
    }));
  }

  create(data: CreateSupplierPaymentData): Promise<SupplierPayment> {
    return repositoryCreate(
      this.runner,
      (db) =>
        db.supplierPayment.create({
          data: toSupplierPaymentCreateInput(data),
        }),
      { model: MODEL, operation: "create" },
    ).then(toSupplierPaymentDomain);
  }

  updateStatus(
    id: SupplierPaymentId,
    data: UpdateSupplierPaymentStatusData,
  ): Promise<SupplierPayment> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.supplierPayment.update({
          where: { id },
          data: toSupplierPaymentStatusUpdateInput(data),
        }),
      { model: MODEL, operation: "updateStatus" },
    ).then(toSupplierPaymentDomain);
  }
}
