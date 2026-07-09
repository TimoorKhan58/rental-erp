import { describe, expect, it, vi } from "vitest";

import { PrismaStockMovementRepository } from "@/modules/stock-movement/infrastructure/repositories/prisma-stock-movement.repository";
import type { DbClient } from "@/shared/infrastructure/database/prisma-types";
import type { RepositoryRunner } from "@/shared/infrastructure/database";

import {
  INVENTORY_ID,
  OTHER_STOCK_MOVEMENT_ID,
  PRODUCT_ID,
  STOCK_MOVEMENT_ID,
  USER_ID,
  WAREHOUSE_ID,
  buildCreateStockMovementData,
  buildStockMovementEntity,
} from "../tests/helpers/stock-movement.fixtures";

interface StockMovementRecord {
  id: string;
  inventoryId: string;
  productId: string;
  warehouseId: string;
  movementType: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  referenceType: string | null;
  referenceId: string | null;
  remarks: string;
  createdAt: Date;
  createdById: string;
}

function cloneRecord(record: StockMovementRecord): StockMovementRecord {
  return {
    ...record,
    createdAt: new Date(record.createdAt),
  };
}

function applyWhereFilter(
  items: StockMovementRecord[],
  where?: Record<string, unknown>,
): StockMovementRecord[] {
  if (!where) {
    return items;
  }

  if (where.AND) {
    const clauses = where.AND as Array<Record<string, unknown>>;
    return clauses.reduce(
      (filtered, clause) => applyWhereFilter(filtered, clause),
      items,
    );
  }

  if (where.OR) {
    const orClauses = where.OR as Array<Record<string, { contains: string }>>;
    return items.filter((item) =>
      orClauses.some((orClause) => {
        const field = Object.keys(orClause)[0] as keyof StockMovementRecord;
        const contains = orClause[field]?.contains.toLowerCase();
        const value = item[field];
        return (
          value !== null &&
          value !== undefined &&
          String(value).toLowerCase().includes(contains ?? "")
        );
      }),
    );
  }

  if (where.inventoryId !== undefined) {
    return items.filter((item) => item.inventoryId === where.inventoryId);
  }

  if (where.productId !== undefined) {
    return items.filter((item) => item.productId === where.productId);
  }

  if (where.warehouseId !== undefined) {
    return items.filter((item) => item.warehouseId === where.warehouseId);
  }

  if (where.movementType !== undefined) {
    return items.filter((item) => item.movementType === where.movementType);
  }

  return items;
}

function createMockStockMovementStore(initial: StockMovementRecord[] = []) {
  const records = new Map(
    initial.map((record) => [record.id, cloneRecord(record)]),
  );

  const inventoryTransaction = {
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
      const match = records.get(where.id);
      return match ? cloneRecord(match) : null;
    }),
    findMany: vi.fn(
      async ({
        where,
        orderBy,
        skip,
        take,
      }: {
        where?: Record<string, unknown>;
        orderBy?: Record<string, string>;
        skip?: number;
        take?: number;
      }) => {
        const items = applyWhereFilter([...records.values()], where);

        if (orderBy) {
          const field = Object.keys(orderBy)[0] as keyof StockMovementRecord;
          const direction = orderBy[field] === "desc" ? -1 : 1;
          items.sort((left, right) => {
            const leftValue = left[field] ?? "";
            const rightValue = right[field] ?? "";
            return String(leftValue).localeCompare(String(rightValue)) * direction;
          });
        }

        return items
          .slice(skip ?? 0, (skip ?? 0) + (take ?? items.length))
          .map(cloneRecord);
      },
    ),
    count: vi.fn(async ({ where }: { where?: Record<string, unknown> }) =>
      applyWhereFilter([...records.values()], where).length,
    ),
    create: vi.fn(
      async ({
        data,
      }: {
        data: {
          inventory: { connect: { id: string } };
          productId: string;
          warehouseId: string;
          movementType: string;
          quantity: number;
          previousQuantity: number;
          newQuantity: number;
          referenceType: string | null;
          referenceId: string | null;
          remarks: string;
          createdBy: { connect: { id: string } };
        };
      }) => {
        const now = new Date();
        const record: StockMovementRecord = {
          id: crypto.randomUUID(),
          inventoryId: data.inventory.connect.id,
          productId: data.productId,
          warehouseId: data.warehouseId,
          movementType: data.movementType,
          quantity: data.quantity,
          previousQuantity: data.previousQuantity,
          newQuantity: data.newQuantity,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          remarks: data.remarks,
          createdAt: now,
          createdById: data.createdBy.connect.id,
        };
        records.set(record.id, record);
        return cloneRecord(record);
      },
    ),
  };

  return {
    db: { inventoryTransaction } as unknown as DbClient,
    store: records,
    inventoryTransaction,
  };
}

function createMockRunner(db: DbClient): RepositoryRunner {
  return {
    get db() {
      return db;
    },
    run: (operation) => operation(db),
    withTransaction: (tx) => createMockRunner(tx as unknown as DbClient),
  };
}

describe("PrismaStockMovementRepository", () => {
  const baseRecord: StockMovementRecord = {
    id: STOCK_MOVEMENT_ID,
    inventoryId: INVENTORY_ID,
    productId: PRODUCT_ID,
    warehouseId: WAREHOUSE_ID,
    movementType: "IN",
    quantity: 10,
    previousQuantity: 100,
    newQuantity: 110,
    referenceType: "purchase-order",
    referenceId: "PO-001",
    remarks: "Initial stock receipt",
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    createdById: USER_ID,
  };

  it("finds stock movement by id", async () => {
    const { db } = createMockStockMovementStore([baseRecord]);
    const repository = new PrismaStockMovementRepository(createMockRunner(db));

    const movement = await repository.findById(STOCK_MOVEMENT_ID);

    expect(movement?.movementType).toBe("IN");
    expect(movement?.quantity).toBe(10);
  });

  it("returns null when stock movement is not found", async () => {
    const { db } = createMockStockMovementStore();
    const repository = new PrismaStockMovementRepository(createMockRunner(db));

    const movement = await repository.findById(STOCK_MOVEMENT_ID);

    expect(movement).toBeNull();
  });

  it("creates stock movement ledger entry", async () => {
    const { db, store, inventoryTransaction } = createMockStockMovementStore();
    const repository = new PrismaStockMovementRepository(createMockRunner(db));

    const created = await repository.create(buildCreateStockMovementData());

    expect(store.size).toBe(1);
    expect(inventoryTransaction.create).toHaveBeenCalled();
    expect(created.movementType).toBe("IN");
    expect(created.createdById).toBe(USER_ID);
  });

  it("finds paged stock movements", async () => {
    const { db } = createMockStockMovementStore([
      baseRecord,
      {
        ...baseRecord,
        id: OTHER_STOCK_MOVEMENT_ID,
        movementType: "OUT",
        previousQuantity: 110,
        newQuantity: 100,
      },
    ]);
    const repository = new PrismaStockMovementRepository(createMockRunner(db));

    const result = await repository.findPaged({
      page: 1,
      pageSize: 20,
      sortOrder: "desc",
    });

    expect(result.items).toHaveLength(2);
    expect(result.meta.total).toBe(2);
  });

  it("filters paged results by inventoryId", async () => {
    const { db } = createMockStockMovementStore([baseRecord]);
    const repository = new PrismaStockMovementRepository(createMockRunner(db));

    const result = await repository.findPaged({
      page: 1,
      pageSize: 20,
      sortOrder: "desc",
      inventoryId: INVENTORY_ID,
    });

    expect(result.items).toHaveLength(1);
  });

  it("filters paged results by movementType", async () => {
    const { db } = createMockStockMovementStore([
      baseRecord,
      {
        ...baseRecord,
        id: OTHER_STOCK_MOVEMENT_ID,
        movementType: "OUT",
      },
    ]);
    const repository = new PrismaStockMovementRepository(createMockRunner(db));

    const result = await repository.findPaged({
      page: 1,
      pageSize: 20,
      sortOrder: "desc",
      movementType: "OUT",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.movementType).toBe("OUT");
  });

  it("maps domain entity from persisted record", async () => {
    const { db } = createMockStockMovementStore([baseRecord]);
    const repository = new PrismaStockMovementRepository(createMockRunner(db));

    const movement = await repository.findById(STOCK_MOVEMENT_ID);
    const props = movement?.toProps();

    expect(props?.referenceType).toBe("purchase-order");
    expect(props?.referenceId).toBe("PO-001");
    expect(props?.remarks).toBe("Initial stock receipt");
  });

  it("reconstitutes all movement types from persistence", async () => {
    for (const movementType of [
      "IN",
      "OUT",
      "RESERVE",
      "RELEASE",
      "ADJUSTMENT",
    ] as const) {
      const entity = buildStockMovementEntity({ movementType });
      const props = entity.toProps();
      const { db } = createMockStockMovementStore([
        {
          id: props.id,
          inventoryId: props.inventoryId,
          productId: props.productId,
          warehouseId: props.warehouseId,
          movementType: props.movementType,
          quantity: props.quantity,
          previousQuantity: props.previousQuantity,
          newQuantity: props.newQuantity,
          referenceType: props.referenceType,
          referenceId: props.referenceId,
          remarks: props.remarks,
          createdAt: props.createdAt,
          createdById: props.createdById,
        },
      ]);
      const repository = new PrismaStockMovementRepository(createMockRunner(db));

      const movement = await repository.findById(props.id);
      expect(movement?.movementType).toBe(movementType);
    }
  });
});
