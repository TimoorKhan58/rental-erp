import type { PurchaseOrderListQuery } from "@/modules/procurement/domain/purchase-order-list.query";
import type { PurchaseOrderId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryCreate,
  repositoryFindFirst,
  repositoryUpdate,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import { PurchaseOrder } from "@/modules/procurement/domain/purchase-order.entity";
import type { IPurchaseOrderRepository } from "@/modules/procurement/domain/purchase-order.repository.interface";
import type {
  CreatePurchaseOrderData,
  UpdatePurchaseOrderData,
  UpdatePurchaseOrderReceiveData,
} from "@/modules/procurement/domain/purchase-order.types";
import { PURCHASE_ORDER_SEARCH_FIELDS } from "@/modules/procurement/domain/purchase-order.constants";

import {
  PURCHASE_ORDER_INCLUDE,
  toPurchaseOrderCreateInput,
  toPurchaseOrderDomain,
  toPurchaseOrderReceiveUpdateInput,
  toPurchaseOrderUpdateInput,
} from "../mappers/purchase-order.persistence.mapper";

const MODEL = "PurchaseOrder";

const DEFAULT_ORDER_BY = {
  createdAt: "desc" as const,
};

function mapPurchaseOrderFilter(
  filter: Record<string, unknown>,
): import("@/generated/prisma/client").Prisma.PurchaseOrderWhereInput | undefined {
  const where: import("@/generated/prisma/client").Prisma.PurchaseOrderWhereInput =
    {};

  if (filter.status !== undefined) {
    where.status = filter.status as PurchaseOrder["status"];
  }

  if (filter.supplierId !== undefined) {
    where.supplierId = String(filter.supplierId);
  }

  if (filter.warehouseId !== undefined) {
    where.warehouseId = String(filter.warehouseId);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapPurchaseOrderSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): import("@/generated/prisma/client").Prisma.PurchaseOrderOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as import("@/generated/prisma/client").Prisma.PurchaseOrderOrderByWithRelationInput;
}

export class PrismaPurchaseOrderRepository implements IPurchaseOrderRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: PurchaseOrderId): Promise<PurchaseOrder | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.purchaseOrder.findUnique({
          where: { id },
          include: PURCHASE_ORDER_INCLUDE,
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toPurchaseOrderDomain(record) : null));
  }

  findByPoNumber(poNumber: string): Promise<PurchaseOrder | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.purchaseOrder.findUnique({
          where: { poNumber },
          include: PURCHASE_ORDER_INCLUDE,
        }),
      { model: MODEL, operation: "findByPoNumber" },
    ).then((record) => (record ? toPurchaseOrderDomain(record) : null));
  }

  findPaged(
    query: PurchaseOrderListQuery,
  ): Promise<PaginatedResult<PurchaseOrder>> {
    const filter: Record<string, unknown> = {};

    if (query.status !== undefined) {
      filter.status = query.status;
    }

    if (query.supplierId !== undefined) {
      filter.supplierId = query.supplierId;
    }

    if (query.warehouseId !== undefined) {
      filter.warehouseId = query.warehouseId;
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
          searchFields: PURCHASE_ORDER_SEARCH_FIELDS,
        }),
        searchFields: PURCHASE_ORDER_SEARCH_FIELDS,
        mapFilter: mapPurchaseOrderFilter,
        mapSort: mapPurchaseOrderSort,
        handlers: {
          findMany: (db, args) =>
            db.purchaseOrder.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
              include: PURCHASE_ORDER_INCLUDE,
            }),
          count: (db, args) =>
            db.purchaseOrder.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    ).then((result) => ({
      items: result.items.map(toPurchaseOrderDomain),
      meta: result.meta,
    }));
  }

  create(data: CreatePurchaseOrderData): Promise<PurchaseOrder> {
    return repositoryCreate(
      this.runner,
      (db) =>
        db.purchaseOrder.create({
          data: toPurchaseOrderCreateInput(data),
          include: PURCHASE_ORDER_INCLUDE,
        }),
      { model: MODEL, operation: "create" },
    ).then(toPurchaseOrderDomain);
  }

  update(
    id: PurchaseOrderId,
    data: UpdatePurchaseOrderData,
  ): Promise<PurchaseOrder> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.purchaseOrder.update({
          where: { id },
          data: toPurchaseOrderUpdateInput(data),
          include: PURCHASE_ORDER_INCLUDE,
        }),
      { model: MODEL, operation: "update" },
    ).then(toPurchaseOrderDomain);
  }

  updateReceive(
    id: PurchaseOrderId,
    data: UpdatePurchaseOrderReceiveData,
  ): Promise<PurchaseOrder> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.purchaseOrder.update({
          where: { id },
          data: toPurchaseOrderReceiveUpdateInput(data),
          include: PURCHASE_ORDER_INCLUDE,
        }),
      { model: MODEL, operation: "updateReceive" },
    ).then(toPurchaseOrderDomain);
  }

  updateStatus(
    id: PurchaseOrderId,
    status: PurchaseOrder["status"],
  ): Promise<PurchaseOrder> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.purchaseOrder.update({
          where: { id },
          data: { status },
          include: PURCHASE_ORDER_INCLUDE,
        }),
      { model: MODEL, operation: "updateStatus" },
    ).then(toPurchaseOrderDomain);
  }
}
