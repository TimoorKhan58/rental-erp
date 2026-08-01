import { Prisma } from "@/generated/prisma/client";
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

type InventoryStockStatus = NonNullable<InventoryListQuery["stockStatus"]>;

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

/**
 * Push stock-status predicates into SQL so list pages can paginate in the DB.
 * Available qty = quantityOnHand - reservedQuantity.
 */
function buildStockStatusSql(stockStatus: InventoryStockStatus): Prisma.Sql {
  switch (stockStatus) {
    case "out-of-stock":
      return Prisma.sql`("quantityOnHand" - "reservedQuantity") <= 0`;
    case "low-stock":
      return Prisma.sql`("quantityOnHand" - "reservedQuantity") > 0 AND "minimumStock" > 0 AND ("quantityOnHand" - "reservedQuantity") <= "minimumStock"`;
    case "overstock":
      return Prisma.sql`"maximumStock" IS NOT NULL AND "quantityOnHand" > "maximumStock" AND ("quantityOnHand" - "reservedQuantity") > 0 AND NOT ("minimumStock" > 0 AND ("quantityOnHand" - "reservedQuantity") <= "minimumStock")`;
    case "in-stock":
      return Prisma.sql`("quantityOnHand" - "reservedQuantity") > 0 AND NOT ("minimumStock" > 0 AND ("quantityOnHand" - "reservedQuantity") <= "minimumStock") AND NOT ("maximumStock" IS NOT NULL AND "quantityOnHand" > "maximumStock")`;
  }
}

type InventorySqlRow = {
  id: string;
  productId: string;
  warehouseId: string;
  quantityOnHand: number;
  reservedQuantity: number;
  minimumStock: number;
  maximumStock: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

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

  findByIdForUpdate(id: InventoryId): Promise<Inventory | null> {
    return this.runner
      .run(
        async (db) => {
          const rows = await db.$queryRaw<InventorySqlRow[]>`
            SELECT i.id, i."productId", i."warehouseId", i."quantityOnHand",
                   i."reservedQuantity", i."minimumStock", i."maximumStock",
                   i."isActive", i."createdAt", i."updatedAt"
            FROM "inventory" i
            WHERE i.id = ${String(id)}::uuid
            FOR UPDATE
          `;

          return rows[0] ?? null;
        },
        { model: MODEL, operation: "findByIdForUpdate" },
      )
      .then((record) => (record ? toInventoryDomain(record) : null));
  }

  unlockInventory(_id: InventoryId): Promise<void> {
    // Row lock is released automatically when the Unit of Work transaction ends.
    return Promise.resolve();
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

  findByProductsAndWarehouse(
    productIds: ProductId[],
    warehouseId: WarehouseId,
  ): Promise<Inventory[]> {
    if (productIds.length === 0) {
      return Promise.resolve([]);
    }

    const uniqueIds = [...new Set(productIds)];

    return this.runner
      .run(
        (db) =>
          db.inventory.findMany({
            where: {
              warehouseId,
              productId: { in: uniqueIds },
            },
          }),
        { model: MODEL, operation: "findByProductsAndWarehouse" },
      )
      .then((records) => records.map(toInventoryDomain));
  }

  async findPaged(
    query: InventoryListQuery,
  ): Promise<PaginatedResult<Inventory>> {
    const filter = buildInventoryFilter(query);
    const hasFilter = Object.keys(filter).length > 0;
    const searchWhere = buildInventorySearchClause(query.search);

    if (query.stockStatus !== undefined) {
      return this.findPagedByStockStatus(query, filter);
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

  private async findPagedByStockStatus(
    query: InventoryListQuery,
    filter: Record<string, unknown>,
  ): Promise<PaginatedResult<Inventory>> {
    const stockStatus = query.stockStatus!;
    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;
    const sortField = query.sortBy ?? "createdAt";
    const sortOrder = query.sortOrder ?? "desc";
    const allowedSort = new Set([
      "createdAt",
      "updatedAt",
      "quantityOnHand",
      "reservedQuantity",
      "minimumStock",
      "maximumStock",
      "productId",
      "warehouseId",
      "isActive",
    ]);
    const safeSortField = allowedSort.has(sortField) ? sortField : "createdAt";
    const orderDirection =
      sortOrder === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const orderColumn = Prisma.raw(`i."${safeSortField}"`);

    const conditions: Prisma.Sql[] = [buildStockStatusSql(stockStatus)];

    if (filter.productId !== undefined) {
      conditions.push(
        Prisma.sql`i."productId" = ${String(filter.productId)}::uuid`,
      );
    }
    if (filter.warehouseId !== undefined) {
      conditions.push(
        Prisma.sql`i."warehouseId" = ${String(filter.warehouseId)}::uuid`,
      );
    }
    if (filter.isActive !== undefined) {
      conditions.push(Prisma.sql`i."isActive" = ${Boolean(filter.isActive)}`);
    }

    const searchTerm = query.search?.trim();
    const needsSearchJoin =
      searchTerm !== undefined && searchTerm.length > 0;
    if (needsSearchJoin) {
      const like = `%${searchTerm}%`;
      conditions.push(
        Prisma.sql`(
          p."productCode" ILIKE ${like}
          OR p.name ILIKE ${like}
          OR w."warehouseCode" ILIKE ${like}
          OR w.name ILIKE ${like}
          OR (
            ${searchTerm}::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND (i."productId"::text = ${searchTerm} OR i."warehouseId"::text = ${searchTerm})
          )
        )`,
      );
    }

    const whereSql = Prisma.join(conditions, " AND ");
    const joinSql = needsSearchJoin
      ? Prisma.sql`
          INNER JOIN "products" p ON p.id = i."productId"
          INNER JOIN "warehouses" w ON w.id = i."warehouseId"
        `
      : Prisma.empty;

    const { rows, total } = await this.runner.run(
      async (db) => {
        const [pagedRows, countRows] = await Promise.all([
          db.$queryRaw<InventorySqlRow[]>`
            SELECT i.id, i."productId", i."warehouseId", i."quantityOnHand",
                   i."reservedQuantity", i."minimumStock", i."maximumStock",
                   i."isActive", i."createdAt", i."updatedAt"
            FROM "inventory" i
            ${joinSql}
            WHERE ${whereSql}
            ORDER BY ${orderColumn} ${orderDirection}
            LIMIT ${take} OFFSET ${skip}
          `,
          db.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*)::bigint AS count
            FROM "inventory" i
            ${joinSql}
            WHERE ${whereSql}
          `,
        ]);

        return {
          rows: pagedRows,
          total: Number(countRows[0]?.count ?? 0),
        };
      },
      { model: MODEL, operation: "findPaged" },
    );

    return {
      items: rows.map(toInventoryDomain),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
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
