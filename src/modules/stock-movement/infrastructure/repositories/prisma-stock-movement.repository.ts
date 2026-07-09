import type { Prisma } from "@/generated/prisma/client";
import type { StockMovementListQuery } from "@/modules/stock-movement/domain/stock-movement-list.query";
import type { StockMovementId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryCreate,
  repositoryFindFirst,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import { StockMovement } from "@/modules/stock-movement/domain/stock-movement.entity";
import type { IStockMovementRepository } from "@/modules/stock-movement/domain/stock-movement.repository.interface";
import type { CreateStockMovementData } from "@/modules/stock-movement/domain/stock-movement.types";
import { STOCK_MOVEMENT_SEARCH_FIELDS } from "@/modules/stock-movement/domain/stock-movement.constants";

import {
  toStockMovementCreateInput,
  toStockMovementDomain,
} from "../mappers/stock-movement.persistence.mapper";

const MODEL = "InventoryTransaction";

const DEFAULT_ORDER_BY: Prisma.InventoryTransactionOrderByWithRelationInput = {
  createdAt: "desc",
};

function buildStockMovementFilter(
  query: StockMovementListQuery,
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (query.inventoryId !== undefined) {
    filter.inventoryId = query.inventoryId;
  }

  if (query.productId !== undefined) {
    filter.productId = query.productId;
  }

  if (query.warehouseId !== undefined) {
    filter.warehouseId = query.warehouseId;
  }

  if (query.movementType !== undefined) {
    filter.movementType = query.movementType;
  }

  return filter;
}

function mapStockMovementFilter(
  filter: Record<string, unknown>,
): Prisma.InventoryTransactionWhereInput | undefined {
  const where: Prisma.InventoryTransactionWhereInput = {};

  if (filter.inventoryId !== undefined) {
    where.inventoryId = String(filter.inventoryId);
  }

  if (filter.productId !== undefined) {
    where.productId = String(filter.productId);
  }

  if (filter.warehouseId !== undefined) {
    where.warehouseId = String(filter.warehouseId);
  }

  if (filter.movementType !== undefined) {
    where.movementType = String(
      filter.movementType,
    ) as Prisma.EnumStockMovementTypeFilter["equals"];
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapStockMovementSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.InventoryTransactionOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.InventoryTransactionOrderByWithRelationInput;
}

export class PrismaStockMovementRepository implements IStockMovementRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: StockMovementId): Promise<StockMovement | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.inventoryTransaction.findUnique({
          where: { id },
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toStockMovementDomain(record) : null));
  }

  async findPaged(
    query: StockMovementListQuery,
  ): Promise<PaginatedResult<StockMovement>> {
    const filter = buildStockMovementFilter(query);
    const hasFilter = Object.keys(filter).length > 0;

    const result = await runRepositoryPagedQuery(
      this.runner,
      {
        spec: createRepositoryQuerySpec({
          page: query.page,
          pageSize: query.pageSize,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          filter: hasFilter ? filter : undefined,
          search: query.search,
          searchFields: STOCK_MOVEMENT_SEARCH_FIELDS,
        }),
        searchFields: STOCK_MOVEMENT_SEARCH_FIELDS,
        mapFilter: mapStockMovementFilter,
        mapSort: mapStockMovementSort,
        handlers: {
          findMany: (db, args) =>
            db.inventoryTransaction.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
            }),
          count: (db, args) =>
            db.inventoryTransaction.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    );

    return {
      items: result.items.map(toStockMovementDomain),
      meta: result.meta,
    };
  }

  async create(data: CreateStockMovementData): Promise<StockMovement> {
    const record = await repositoryCreate(
      this.runner,
      (db) =>
        db.inventoryTransaction.create({
          data: toStockMovementCreateInput(data),
        }),
      { model: MODEL, operation: "create" },
    );

    return toStockMovementDomain(record);
  }
}
