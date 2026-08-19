import type { Prisma } from "@/generated/prisma/client";
import type { InventoryListQuery } from "@/modules/inventory/domain/inventory-list.query";
import type { InventoryId, ProductId, WarehouseId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
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

  /**
   * Capacity check and reservedQuantity increment are enforced in one SQL UPDATE.
   * Uses the repository runner's transaction-scoped client when inside a UoW.
   */
  reserveAvailableQuantity(
    id: InventoryId,
    quantity: number,
  ): Promise<Inventory | null> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return Promise.resolve(null);
    }

    return this.runner.run(
      async (db) => {
        const rows = await db.$queryRaw<
          Array<{
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
          }>
        >`
          UPDATE "inventory"
          SET
            "reservedQuantity" = "reservedQuantity" + ${quantity},
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${id}
            AND "reservedQuantity" + ${quantity} <= "quantityOnHand"
            AND "isActive" = true
          RETURNING
            "id",
            "productId",
            "warehouseId",
            "quantityOnHand",
            "reservedQuantity",
            "minimumStock",
            "maximumStock",
            "isActive",
            "createdAt",
            "updatedAt"
        `;

        const record = rows[0];
        return record === undefined ? null : toInventoryDomain(record);
      },
      { model: MODEL, operation: "reserveAvailableQuantity" },
    );
  }

  /**
   * Reserved-quantity decrement is enforced in one SQL UPDATE.
   * Uses the repository runner's transaction-scoped client when inside a UoW.
   * Does not require isActive — existing holds must still be releasable.
   */
  releaseReservedQuantity(
    id: InventoryId,
    quantity: number,
  ): Promise<Inventory | null> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return Promise.resolve(null);
    }

    return this.runner.run(
      async (db) => {
        const rows = await db.$queryRaw<
          Array<{
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
          }>
        >`
          UPDATE "inventory"
          SET
            "reservedQuantity" = "reservedQuantity" - ${quantity},
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${id}
            AND "reservedQuantity" >= ${quantity}
          RETURNING
            "id",
            "productId",
            "warehouseId",
            "quantityOnHand",
            "reservedQuantity",
            "minimumStock",
            "maximumStock",
            "isActive",
            "createdAt",
            "updatedAt"
        `;

        const record = rows[0];
        return record === undefined ? null : toInventoryDomain(record);
      },
      { model: MODEL, operation: "releaseReservedQuantity" },
    );
  }

  /**
   * Phase 29 (F-03): OUT is enforced by one atomic SQL UPDATE.
   * Predicate: quantityOnHand >= quantity AND isActive = true.
   * When zero rows match, the caller must translate to a business error;
   * the database — not stale application state — is the concurrency
   * authority for the non-negativity invariant.
   */
  decrementOnHand(
    id: InventoryId,
    quantity: number,
  ): Promise<Inventory | null> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return Promise.resolve(null);
    }

    return this.runner.run(
      async (db) => {
        const rows = await db.$queryRaw<
          Array<{
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
          }>
        >`
          UPDATE "inventory"
          SET
            "quantityOnHand" = "quantityOnHand" - ${quantity},
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${id}
            AND "quantityOnHand" >= ${quantity}
            AND "isActive" = true
          RETURNING
            "id",
            "productId",
            "warehouseId",
            "quantityOnHand",
            "reservedQuantity",
            "minimumStock",
            "maximumStock",
            "isActive",
            "createdAt",
            "updatedAt"
        `;

        const record = rows[0];
        return record === undefined ? null : toInventoryDomain(record);
      },
      { model: MODEL, operation: "decrementOnHand" },
    );
  }

  /**
   * Phase 29 (F-03): IN is enforced by one atomic SQL UPDATE.
   * Predicate: isActive = true. quantityOnHand is monotonically added
   * inside the database statement — no read-modify-write.
   */
  incrementOnHand(
    id: InventoryId,
    quantity: number,
  ): Promise<Inventory | null> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return Promise.resolve(null);
    }

    return this.runner.run(
      async (db) => {
        const rows = await db.$queryRaw<
          Array<{
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
          }>
        >`
          UPDATE "inventory"
          SET
            "quantityOnHand" = "quantityOnHand" + ${quantity},
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${id}
            AND "isActive" = true
          RETURNING
            "id",
            "productId",
            "warehouseId",
            "quantityOnHand",
            "reservedQuantity",
            "minimumStock",
            "maximumStock",
            "isActive",
            "createdAt",
            "updatedAt"
        `;

        const record = rows[0];
        return record === undefined ? null : toInventoryDomain(record);
      },
      { model: MODEL, operation: "incrementOnHand" },
    );
  }

  /**
   * Phase 29 (F-03): ADJUSTMENT applies a signed delta atomically while
   * preserving `reservedQuantity <= quantityOnHand`. Predicate:
   *   isActive = true AND quantityOnHand + delta >= reservedQuantity.
   */
  applyAdjustment(
    id: InventoryId,
    signedDelta: number,
  ): Promise<Inventory | null> {
    if (!Number.isInteger(signedDelta) || signedDelta === 0) {
      return Promise.resolve(null);
    }

    return this.runner.run(
      async (db) => {
        const rows = await db.$queryRaw<
          Array<{
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
          }>
        >`
          UPDATE "inventory"
          SET
            "quantityOnHand" = "quantityOnHand" + ${signedDelta},
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${id}
            AND "isActive" = true
            AND "quantityOnHand" + ${signedDelta} >= "reservedQuantity"
          RETURNING
            "id",
            "productId",
            "warehouseId",
            "quantityOnHand",
            "reservedQuantity",
            "minimumStock",
            "maximumStock",
            "isActive",
            "createdAt",
            "updatedAt"
        `;

        const record = rows[0];
        return record === undefined ? null : toInventoryDomain(record);
      },
      { model: MODEL, operation: "applyAdjustment" },
    );
  }

  /**
   * Phase 31 (F-31-01): row-level lock for F-02 date-aware reservation serialization.
   */
  lockForAvailabilityCommit(id: InventoryId): Promise<void> {
    return this.runner.run(
      async (db) => {
        const rows = await db.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "inventory" WHERE id = ${id} FOR UPDATE
        `;

        if (rows.length === 0) {
          throw new Error("Inventory not found");
        }
      },
      { model: MODEL, operation: "lockForAvailabilityCommit" },
    );
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
