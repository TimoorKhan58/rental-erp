import { describe, expect, it, vi } from "vitest";

import { PrismaInventoryRepository } from "@/modules/inventory/infrastructure/repositories/prisma-inventory.repository";
import type { DbClient } from "@/shared/infrastructure/database/prisma-types";
import type { RepositoryRunner } from "@/shared/infrastructure/database";

import {
  INVENTORY_ID,
  OTHER_INVENTORY_ID,
  OTHER_PRODUCT_ID,
  OTHER_WAREHOUSE_ID,
  PRODUCT_ID,
  WAREHOUSE_ID,
  buildCreateInventoryData,
  buildInventoryEntity,
} from "../tests/helpers/inventory.fixtures";

interface InventoryRecord {
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
}

function cloneInventoryRecord(record: InventoryRecord): InventoryRecord {
  return {
    ...record,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}

function applyWhereFilter(
  items: InventoryRecord[],
  where?: Record<string, unknown>,
): InventoryRecord[] {
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
        const field = Object.keys(orClause)[0] as keyof InventoryRecord;
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

  if (where.productId !== undefined) {
    return items.filter((item) => item.productId === where.productId);
  }

  if (where.warehouseId !== undefined) {
    return items.filter((item) => item.warehouseId === where.warehouseId);
  }

  if (where.isActive !== undefined) {
    return items.filter((item) => item.isActive === where.isActive);
  }

  return items;
}

function createMockInventoryStore(initial: InventoryRecord[] = []) {
  const records = new Map(
    initial.map((record) => [record.id, cloneInventoryRecord(record)]),
  );

  const inventory = {
    findUnique: vi.fn(
      async ({
        where,
        select,
      }: {
        where: Record<string, unknown>;
        select?: Record<string, boolean>;
      }) => {
        if (where.productId_warehouseId) {
          const composite = where.productId_warehouseId as {
            productId: string;
            warehouseId: string;
          };
          const match = [...records.values()].find(
            (record) =>
              record.productId === composite.productId &&
              record.warehouseId === composite.warehouseId,
          );

          if (!match) {
            return null;
          }

          if (select?.id) {
            return { id: match.id };
          }

          return cloneInventoryRecord(match);
        }

        const match = records.get(String(where.id));

        if (!match) {
          return null;
        }

        if (select?.id) {
          return { id: match.id };
        }

        return cloneInventoryRecord(match);
      },
    ),
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
          const field = Object.keys(orderBy)[0] as keyof InventoryRecord;
          const direction = orderBy[field] === "desc" ? -1 : 1;
          items.sort((left, right) => {
            const leftValue = left[field] ?? "";
            const rightValue = right[field] ?? "";
            return String(leftValue).localeCompare(String(rightValue)) * direction;
          });
        }

        return items
          .slice(skip ?? 0, (skip ?? 0) + (take ?? items.length))
          .map(cloneInventoryRecord);
      },
    ),
    count: vi.fn(async ({ where }: { where?: Record<string, unknown> }) =>
      applyWhereFilter([...records.values()], where).length,
    ),
    create: vi.fn(
      async ({
        data,
      }: {
        data: Omit<InventoryRecord, "id" | "createdAt" | "updatedAt">;
      }) => {
        const now = new Date();
        const record: InventoryRecord = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        records.set(record.id, record);
        return cloneInventoryRecord(record);
      },
    ),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<InventoryRecord>;
      }) => {
        const existing = records.get(where.id);
        if (!existing) {
          throw new Error("not found");
        }

        const updated: InventoryRecord = {
          ...existing,
          ...data,
          updatedAt: new Date(),
        };
        records.set(where.id, updated);
        return cloneInventoryRecord(updated);
      },
    ),
    delete: vi.fn(async ({ where }: { where: { id: string } }) => {
      records.delete(where.id);
      return { id: where.id };
    }),
  };

  return {
    db: { inventory } as unknown as DbClient,
    store: records,
    inventory,
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

describe("PrismaInventoryRepository", () => {
  const baseRecord: InventoryRecord = {
    id: INVENTORY_ID,
    productId: PRODUCT_ID,
    warehouseId: WAREHOUSE_ID,
    quantityOnHand: 100,
    reservedQuantity: 10,
    minimumStock: 5,
    maximumStock: 500,
    isActive: true,
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-01-15T10:00:00.000Z"),
  };

  it("finds inventory by id", async () => {
    const { db } = createMockInventoryStore([baseRecord]);
    const repository = new PrismaInventoryRepository(createMockRunner(db));

    const inventory = await repository.findById(INVENTORY_ID);

    expect(inventory?.quantityOnHand).toBe(100);
    expect(inventory?.availableQuantity).toBe(90);
  });

  it("finds inventory by product and warehouse", async () => {
    const { db } = createMockInventoryStore([baseRecord]);
    const repository = new PrismaInventoryRepository(createMockRunner(db));

    const inventory = await repository.findByProductAndWarehouse(
      PRODUCT_ID,
      WAREHOUSE_ID,
    );

    expect(inventory?.id).toBe(INVENTORY_ID);
  });

  it("creates inventory without persisting availableQuantity", async () => {
    const { db, store, inventory } = createMockInventoryStore();
    const repository = new PrismaInventoryRepository(createMockRunner(db));

    const created = await repository.create(buildCreateInventoryData());

    expect(store.size).toBe(1);
    expect(inventory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          availableQuantity: expect.anything(),
        }),
      }),
    );
    expect(created.availableQuantity).toBe(90);
  });

  it("creates, updates, and deletes inventory", async () => {
    const { db, store } = createMockInventoryStore();
    const repository = new PrismaInventoryRepository(createMockRunner(db));

    const created = await repository.create(buildCreateInventoryData());
    expect(store.size).toBe(1);

    const updated = await repository.update(created.id, {
      quantityOnHand: 150,
    });
    expect(updated.quantityOnHand).toBe(150);
    expect(updated.availableQuantity).toBe(140);

    await repository.delete(created.id);
    expect(store.size).toBe(0);
  });

  it("paginates, searches, and sorts inventory", async () => {
    const { db } = createMockInventoryStore([
      baseRecord,
      {
        ...baseRecord,
        id: OTHER_INVENTORY_ID,
        productId: OTHER_PRODUCT_ID,
        warehouseId: OTHER_WAREHOUSE_ID,
        quantityOnHand: 50,
        reservedQuantity: 0,
      },
    ]);
    const repository = new PrismaInventoryRepository(createMockRunner(db));

    const result = await repository.findPaged({
      page: 1,
      pageSize: 1,
      sortBy: "quantityOnHand",
      sortOrder: "asc",
      search: OTHER_PRODUCT_ID,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.productId).toBe(OTHER_PRODUCT_ID);
    expect(result.meta.total).toBe(1);
  });

  it("filters by productId and warehouseId", async () => {
    const { db } = createMockInventoryStore([
      baseRecord,
      {
        ...baseRecord,
        id: OTHER_INVENTORY_ID,
        productId: OTHER_PRODUCT_ID,
        warehouseId: OTHER_WAREHOUSE_ID,
      },
    ]);
    const repository = new PrismaInventoryRepository(createMockRunner(db));

    const byProduct = await repository.findPaged({
      page: 1,
      pageSize: 20,
      productId: PRODUCT_ID,
    });
    expect(byProduct.items).toHaveLength(1);

    const byWarehouse = await repository.findPaged({
      page: 1,
      pageSize: 20,
      warehouseId: WAREHOUSE_ID,
    });
    expect(byWarehouse.items).toHaveLength(1);
  });

  it("uses transaction client via runner.withTransaction", async () => {
    const { db } = createMockInventoryStore([baseRecord]);
    const txDb = createMockInventoryStore([baseRecord]).db;
    const runner: RepositoryRunner = {
      get db() {
        return db;
      },
      run: <T>(operation: (client: DbClient) => Promise<T>) => operation(txDb),
      withTransaction: () => createMockRunner(txDb),
    };
    const repository = new PrismaInventoryRepository(runner);

    const inventory = await repository.findById(INVENTORY_ID);

    expect(inventory).not.toBeNull();
    expect(runner.withTransaction(txDb).db).toBe(txDb);
  });

  it("checks existence without loading full entity", async () => {
    const { db } = createMockInventoryStore([baseRecord]);
    const repository = new PrismaInventoryRepository(createMockRunner(db));

    await expect(repository.exists(INVENTORY_ID)).resolves.toBe(true);
    await expect(
      repository.exists(
        "880e8400-e29b-41d4-a716-446655440099" as typeof INVENTORY_ID,
      ),
    ).resolves.toBe(false);
  });
});

describe("PrismaInventoryRepository mapping", () => {
  it("maps persisted records to domain entities with availableQuantity", async () => {
    const entity = buildInventoryEntity();
    const record: InventoryRecord = {
      id: entity.id,
      productId: entity.productId,
      warehouseId: entity.warehouseId,
      quantityOnHand: entity.quantityOnHand,
      reservedQuantity: entity.reservedQuantity,
      minimumStock: entity.minimumStock,
      maximumStock: entity.maximumStock,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    const { db } = createMockInventoryStore([record]);
    const repository = new PrismaInventoryRepository(createMockRunner(db));

    const found = await repository.findByProductAndWarehouse(
      entity.productId,
      entity.warehouseId,
    );

    expect(found?.toProps().availableQuantity).toBe(90);
  });

  it("rejects invalid merged quantities on update", async () => {
    const { db } = createMockInventoryStore([
      {
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 100,
        reservedQuantity: 10,
        minimumStock: 5,
        maximumStock: 500,
        isActive: true,
        createdAt: new Date("2026-01-15T10:00:00.000Z"),
        updatedAt: new Date("2026-01-15T10:00:00.000Z"),
      },
    ]);
    const repository = new PrismaInventoryRepository(createMockRunner(db));

    await expect(
      repository.update(INVENTORY_ID, { quantityOnHand: 5 }),
    ).rejects.toThrow();
  });
});
