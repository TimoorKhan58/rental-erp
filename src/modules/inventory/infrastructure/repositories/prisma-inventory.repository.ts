import type { Prisma } from "@/generated/prisma/client";
import type { InventoryListQuery } from "@/modules/inventory/domain/inventory-list.query";
import type { InventoryId, ProductId, WarehouseId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  buildPaginationMeta,
  createRepositoryQuerySpec,
  repositoryCreate,
  repositoryDelete,
  repositoryFindFirst,
  repositoryUpdate,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import { Inventory } from "@/modules/inventory/domain/inventory.entity";
import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import type {
  CreateInventoryData,
  UpdateInventoryData,
} from "@/modules/inventory/domain/inventory.types";
import { buildInventorySearchClause } from "@/modules/inventory/domain/inventory-search";

import {
  toInventoryCreateInput,
  toInventoryDomain,
  toInventoryUpdateInput,
} from "../mappers/inventory.persistence.mapper";

const MODEL = "Inventory";

const DEFAULT_ORDER_BY: Prisma.InventoryOrderByWithRelationInput = {
  createdAt: "desc",
};

function buildInventoryFilter(query: InventoryListQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (query.productId !== undefined) {
    filter.productId = query.productId;
  }

  if (query.warehouseId !== undefined) {
    filter.warehouseId = query.warehouseId;
  }

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive;
  }

  return filter;
}

function mapInventoryFilter(
  filter: Record<string, unknown>,
): Prisma.InventoryWhereInput | undefined {
  const where: Prisma.InventoryWhereInput = {};

  if (filter.productId !== undefined) {
    where.productId = String(filter.productId);
  }

  if (filter.warehouseId !== undefined) {
    where.warehouseId = String(filter.warehouseId);
  }

  if (filter.isActive !== undefined) {
    where.isActive = Boolean(filter.isActive);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapInventorySort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.InventoryOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.InventoryOrderByWithRelationInput;
}

function deriveInventoryStockStatus(item: {
  quantityOnHand: number;
  reservedQuantity: number;
  minimumStock: number;
  maximumStock: number | null;
}): "in-stock" | "low-stock" | "out-of-stock" | "overstock" {
  const availableQuantity = item.quantityOnHand - item.reservedQuantity;

  if (availableQuantity <= 0) {
    return "out-of-stock";
  }

  if (item.minimumStock > 0 && availableQuantity <= item.minimumStock) {
    return "low-stock";
  }

  if (item.maximumStock !== null && item.quantityOnHand > item.maximumStock) {
    return "overstock";
  }

  return "in-stock";
}

export class PrismaInventoryRepository implements IInventoryRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: InventoryId): Promise<Inventory | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.inventory.findUnique({
          where: { id },
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toInventoryDomain(record) : null));
  }

  findByProductAndWarehouse(
    productId: ProductId,
    warehouseId: WarehouseId,
  ): Promise<Inventory | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.inventory.findUnique({
          where: {
            productId_warehouseId: {
              productId,
              warehouseId,
            },
          },
        }),
      { model: MODEL, operation: "findByProductAndWarehouse" },
    ).then((record) => (record ? toInventoryDomain(record) : null));
  }

  async findPaged(
    query: InventoryListQuery,
  ): Promise<PaginatedResult<Inventory>> {
    const filter = buildInventoryFilter(query);
    const hasFilter = Object.keys(filter).length > 0;
    const searchWhere = buildInventorySearchClause(query.search);

    if (query.stockStatus !== undefined) {
      const where = {
        ...(searchWhere as Prisma.InventoryWhereInput | undefined),
        ...(mapInventoryFilter(filter) ?? {}),
      } satisfies Prisma.InventoryWhereInput;
      const orderBy = mapInventorySort(
        query.sortBy ? { [query.sortBy]: query.sortOrder ?? "desc" } : undefined,
      );

      const records = await this.runner.run(
        (db) =>
          db.inventory.findMany({
            where,
            orderBy,
          }),
        { model: MODEL, operation: "findPaged" },
      );
      const filtered = records.filter(
        (item) => deriveInventoryStockStatus(item) === query.stockStatus,
      );
      const start = (query.page - 1) * query.pageSize;
      const paged = filtered.slice(start, start + query.pageSize);

      return {
        items: paged.map(toInventoryDomain),
        meta: buildPaginationMeta(query.page, query.pageSize, filtered.length),
      };
    }

    const result = await runRepositoryPagedQuery(
      this.runner,
      {
        spec: createRepositoryQuerySpec({
          page: query.page,
          pageSize: query.pageSize,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          filter: hasFilter ? filter : undefined,
        }),
        baseWhere: searchWhere as Prisma.InventoryWhereInput | undefined,
        mapFilter: mapInventoryFilter,
        mapSort: mapInventorySort,
        handlers: {
          findMany: (db, args) =>
            db.inventory.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
            }),
          count: (db, args) =>
            db.inventory.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    );

    return {
      items: result.items.map(toInventoryDomain),
      meta: result.meta,
    };
  }

  async exists(id: InventoryId): Promise<boolean> {
    const record = await repositoryFindFirst(
      this.runner,
      (db) =>
        db.inventory.findUnique({
          where: { id },
          select: { id: true },
        }),
      { model: MODEL, operation: "exists" },
    );

    return record !== null;
  }

  async create(data: CreateInventoryData): Promise<Inventory> {
    const record = await repositoryCreate(
      this.runner,
      (db) =>
        db.inventory.create({
          data: toInventoryCreateInput(data),
        }),
      { model: MODEL, operation: "create" },
    );

    return toInventoryDomain(record);
  }

  async update(id: InventoryId, data: UpdateInventoryData): Promise<Inventory> {
    const existing = await this.findById(id);

    if (existing === null) {
      throw new Error("Inventory not found");
    }

    const props = existing.toProps();
    Inventory.reconstitute({
      id: props.id,
      productId: props.productId,
      warehouseId: props.warehouseId,
      quantityOnHand: data.quantityOnHand ?? props.quantityOnHand,
      reservedQuantity: data.reservedQuantity ?? props.reservedQuantity,
      minimumStock: data.minimumStock ?? props.minimumStock,
      maximumStock:
        data.maximumStock !== undefined
          ? data.maximumStock
          : props.maximumStock,
      isActive: data.isActive ?? props.isActive,
      createdAt: props.createdAt,
      updatedAt: new Date(),
    });

    const record = await repositoryUpdate(
      this.runner,
      (db) =>
        db.inventory.update({
          where: { id },
          data: toInventoryUpdateInput(data),
        }),
      { model: MODEL, operation: "update" },
    );

    return toInventoryDomain(record);
  }

  delete(id: InventoryId): Promise<void> {
    return repositoryDelete(
      this.runner,
      (db) =>
        db.inventory.delete({
          where: { id },
        }),
      { model: MODEL, operation: "delete" },
    ).then(() => undefined);
  }
}
