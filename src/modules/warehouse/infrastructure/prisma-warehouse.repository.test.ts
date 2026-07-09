import { describe, expect, it, vi } from "vitest";

import { PrismaWarehouseRepository } from "@/modules/warehouse/infrastructure/repositories/prisma-warehouse.repository";
import type { DbClient } from "@/shared/infrastructure/database/prisma-types";
import type { RepositoryRunner } from "@/shared/infrastructure/database";

import {
  WAREHOUSE_ID,
  buildCreateWarehouseData,
  buildWarehouseEntity,
} from "../tests/helpers/warehouse.fixtures";

interface WarehouseRecord {
  id: string;
  warehouseCode: string;
  name: string;
  description: string | null;
  address: string | null;
  contactPerson: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function applyWhereFilter(
  items: WarehouseRecord[],
  where?: Record<string, unknown>,
): WarehouseRecord[] {
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
        const field = Object.keys(orClause)[0] as keyof WarehouseRecord;
        const contains = orClause[field]?.contains.toLowerCase();
        const value = item[field];
        return value !== null && String(value).toLowerCase().includes(contains ?? "");
      }),
    );
  }

  if (where.isActive !== undefined) {
    return items.filter((item) => item.isActive === where.isActive);
  }

  return items;
}

function createMockWarehouseStore(initial: WarehouseRecord[] = []) {
  const records = new Map(initial.map((record) => [record.id, structuredClone(record)]));

  const warehouse = {
    findUnique: vi.fn(async ({ where, select }: { where: Record<string, unknown>; select?: Record<string, boolean> }) => {
      const match = [...records.values()].find((record) =>
        Object.entries(where).every(([key, value]) => record[key as keyof WarehouseRecord] === value),
      );

      if (!match) {
        return null;
      }

      if (select?.id) {
        return { id: match.id };
      }

      return structuredClone(match);
    }),
    findMany: vi.fn(async ({ where, orderBy, skip, take }: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, string>;
      skip?: number;
      take?: number;
    }) => {
      const items = applyWhereFilter([...records.values()], where);

      if (orderBy) {
        const field = Object.keys(orderBy)[0] as keyof WarehouseRecord;
        const direction = orderBy[field] === "desc" ? -1 : 1;
        items.sort((left, right) => {
          const leftValue = left[field] ?? "";
          const rightValue = right[field] ?? "";
          return String(leftValue).localeCompare(String(rightValue)) * direction;
        });
      }

      return items.slice(skip ?? 0, (skip ?? 0) + (take ?? items.length)).map((item) => structuredClone(item));
    }),
    count: vi.fn(async ({ where }: { where?: Record<string, unknown> }) =>
      applyWhereFilter([...records.values()], where).length,
    ),
    create: vi.fn(async ({ data }: { data: Omit<WarehouseRecord, "id" | "createdAt" | "updatedAt"> }) => {
      const now = new Date();
      const record: WarehouseRecord = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      records.set(record.id, record);
      return structuredClone(record);
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<WarehouseRecord> }) => {
      const existing = records.get(where.id);
      if (!existing) {
        throw new Error("not found");
      }

      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      records.set(where.id, updated);
      return structuredClone(updated);
    }),
    delete: vi.fn(async ({ where }: { where: { id: string } }) => {
      records.delete(where.id);
      return { id: where.id };
    }),
  };

  return {
    db: { warehouse } as unknown as DbClient,
    store: records,
    warehouse,
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

describe("PrismaWarehouseRepository", () => {
  const baseRecord: WarehouseRecord = {
    id: WAREHOUSE_ID,
    warehouseCode: "WH-001",
    name: "Main Storage Hub",
    description: "Primary warehouse for inventory",
    address: "789 Logistics Park, Karachi",
    contactPerson: "Warehouse Manager",
    phone: "+923001234567",
    isActive: true,
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-01-15T10:00:00.000Z"),
  };

  it("finds warehouse by id", async () => {
    const { db } = createMockWarehouseStore([baseRecord]);
    const repository = new PrismaWarehouseRepository(createMockRunner(db));

    const warehouse = await repository.findById(WAREHOUSE_ID);

    expect(warehouse?.name).toBe("Main Storage Hub");
  });

  it("creates, updates, and deletes warehouses", async () => {
    const { db, store } = createMockWarehouseStore();
    const repository = new PrismaWarehouseRepository(createMockRunner(db));

    const created = await repository.create(buildCreateWarehouseData());
    expect(store.size).toBe(1);

    const updated = await repository.update(created.id, { name: "Updated" });
    expect(updated.name).toBe("Updated");

    await repository.delete(created.id);
    expect(store.size).toBe(0);
  });

  it("paginates, searches, and sorts warehouses", async () => {
    const { db } = createMockWarehouseStore([
      baseRecord,
      {
        ...baseRecord,
        id: "660e8400-e29b-41d4-a716-446655440001",
        warehouseCode: "WH-002",
        phone: "+923009999999",
        name: "Alpha Warehouse",
      },
    ]);
    const repository = new PrismaWarehouseRepository(createMockRunner(db));

    const result = await repository.findPaged({
      page: 1,
      pageSize: 1,
      sortBy: "name",
      sortOrder: "asc",
      search: "Alpha",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Alpha Warehouse");
    expect(result.meta.total).toBe(1);
  });

  it("uses transaction client via runner.withTransaction", async () => {
    const { db } = createMockWarehouseStore([baseRecord]);
    const txDb = createMockWarehouseStore([baseRecord]).db;
    const runner: RepositoryRunner = {
      get db() {
        return db;
      },
      run: <T>(operation: (client: DbClient) => Promise<T>) => operation(txDb),
      withTransaction: () => createMockRunner(txDb),
    };
    const repository = new PrismaWarehouseRepository(runner);

    const warehouse = await repository.findById(WAREHOUSE_ID);

    expect(warehouse).not.toBeNull();
    expect(runner.withTransaction(txDb).db).toBe(txDb);
  });

  it("checks existence without loading full entity", async () => {
    const { db } = createMockWarehouseStore([baseRecord]);
    const repository = new PrismaWarehouseRepository(createMockRunner(db));

    await expect(repository.exists(WAREHOUSE_ID)).resolves.toBe(true);
    await expect(
      repository.exists("660e8400-e29b-41d4-a716-446655440099" as typeof WAREHOUSE_ID),
    ).resolves.toBe(false);
  });
});

describe("PrismaWarehouseRepository mapping", () => {
  it("maps persisted records to domain entities", async () => {
    const entity = buildWarehouseEntity();
    const record: WarehouseRecord = {
      id: entity.id,
      warehouseCode: entity.warehouseCode,
      name: entity.name,
      description: entity.description,
      address: entity.address,
      contactPerson: entity.contactPerson,
      phone: entity.phone,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    const { db } = createMockWarehouseStore([record]);
    const repository = new PrismaWarehouseRepository(createMockRunner(db));

    const found = await repository.findByWarehouseCode("WH-001");

    expect(found?.toProps().id).toBe(entity.id);
  });
});
