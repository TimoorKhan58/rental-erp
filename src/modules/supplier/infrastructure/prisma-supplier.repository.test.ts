import { describe, expect, it, vi } from "vitest";

import { PrismaSupplierRepository } from "@/modules/supplier/infrastructure/repositories/prisma-supplier.repository";
import type { DbClient } from "@/shared/infrastructure/database/prisma-types";
import type { RepositoryRunner } from "@/shared/infrastructure/database";

import {
  SUPPLIER_ID,
  buildCreateSupplierData,
  buildSupplierEntity,
} from "../tests/helpers/supplier.fixtures";

interface SupplierRecord {
  id: string;
  supplierCode: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function applyWhereFilter(
  items: SupplierRecord[],
  where?: Record<string, unknown>,
): SupplierRecord[] {
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
        const field = Object.keys(orClause)[0] as keyof SupplierRecord;
        const contains = orClause[field]?.contains.toLowerCase();
        return String(item[field]).toLowerCase().includes(contains ?? "");
      }),
    );
  }

  if (where.isActive !== undefined) {
    return items.filter((item) => item.isActive === where.isActive);
  }

  return items;
}

function createMockSupplierStore(initial: SupplierRecord[] = []) {
  const records = new Map(initial.map((record) => [record.id, structuredClone(record)]));

  const supplier = {
    findUnique: vi.fn(async ({ where, select }: { where: Record<string, unknown>; select?: Record<string, boolean> }) => {
      const match = [...records.values()].find((record) =>
        Object.entries(where).every(([key, value]) => record[key as keyof SupplierRecord] === value),
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
        const field = Object.keys(orderBy)[0] as keyof SupplierRecord;
        const direction = orderBy[field] === "desc" ? -1 : 1;
        items.sort((left, right) =>
          String(left[field]).localeCompare(String(right[field])) * direction,
        );
      }

      return items.slice(skip ?? 0, (skip ?? 0) + (take ?? items.length)).map((item) => structuredClone(item));
    }),
    count: vi.fn(async ({ where }: { where?: Record<string, unknown> }) =>
      applyWhereFilter([...records.values()], where).length,
    ),
    create: vi.fn(async ({ data }: { data: Omit<SupplierRecord, "id" | "createdAt" | "updatedAt"> }) => {
      const now = new Date();
      const record: SupplierRecord = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      records.set(record.id, record);
      return structuredClone(record);
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<SupplierRecord> }) => {
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
    db: { supplier } as unknown as DbClient,
    store: records,
    supplier,
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

describe("PrismaSupplierRepository", () => {
  const baseRecord: SupplierRecord = {
    id: SUPPLIER_ID,
    supplierCode: "SUPP-001",
    name: "Fabric Wholesale Co",
    phone: "+923001234567",
    email: "contact@fabricwholesale.com",
    address: "456 Industrial Area, Karachi",
    notes: null,
    isActive: true,
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-01-15T10:00:00.000Z"),
  };

  it("finds supplier by id", async () => {
    const { db } = createMockSupplierStore([baseRecord]);
    const repository = new PrismaSupplierRepository(createMockRunner(db));

    const supplier = await repository.findById(SUPPLIER_ID);

    expect(supplier?.name).toBe("Fabric Wholesale Co");
  });

  it("creates, updates, and deletes suppliers", async () => {
    const { db, store } = createMockSupplierStore();
    const repository = new PrismaSupplierRepository(createMockRunner(db));

    const created = await repository.create(buildCreateSupplierData());
    expect(store.size).toBe(1);

    const updated = await repository.update(created.id, { name: "Updated" });
    expect(updated.name).toBe("Updated");

    await repository.delete(created.id);
    expect(store.size).toBe(0);
  });

  it("paginates, searches, and sorts suppliers", async () => {
    const { db } = createMockSupplierStore([
      baseRecord,
      {
        ...baseRecord,
        id: "660e8400-e29b-41d4-a716-446655440001",
        supplierCode: "SUPP-002",
        phone: "+923009999999",
        name: "Alpha Supplies",
      },
    ]);
    const repository = new PrismaSupplierRepository(createMockRunner(db));

    const result = await repository.findPaged({
      page: 1,
      pageSize: 1,
      sortBy: "name",
      sortOrder: "asc",
      search: "Alpha",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Alpha Supplies");
    expect(result.meta.total).toBe(1);
  });

  it("uses transaction client via runner.withTransaction", async () => {
    const { db } = createMockSupplierStore([baseRecord]);
    const txDb = createMockSupplierStore([baseRecord]).db;
    const runner: RepositoryRunner = {
      get db() {
        return db;
      },
      run: <T>(operation: (client: DbClient) => Promise<T>) => operation(txDb),
      withTransaction: () => createMockRunner(txDb),
    };
    const repository = new PrismaSupplierRepository(runner);

    const supplier = await repository.findById(SUPPLIER_ID);

    expect(supplier).not.toBeNull();
    expect(runner.withTransaction(txDb).db).toBe(txDb);
  });

  it("checks existence without loading full entity", async () => {
    const { db } = createMockSupplierStore([baseRecord]);
    const repository = new PrismaSupplierRepository(createMockRunner(db));

    await expect(repository.exists(SUPPLIER_ID)).resolves.toBe(true);
    await expect(
      repository.exists("660e8400-e29b-41d4-a716-446655440099" as typeof SUPPLIER_ID),
    ).resolves.toBe(false);
  });
});

describe("PrismaSupplierRepository mapping", () => {
  it("maps persisted records to domain entities", async () => {
    const entity = buildSupplierEntity();
    const record: SupplierRecord = {
      id: entity.id,
      supplierCode: entity.supplierCode,
      name: entity.name,
      phone: entity.phone,
      email: entity.email,
      address: entity.address,
      notes: entity.notes,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    const { db } = createMockSupplierStore([record]);
    const repository = new PrismaSupplierRepository(createMockRunner(db));

    const found = await repository.findBySupplierCode("SUPP-001");

    expect(found?.toProps().id).toBe(entity.id);
  });
});
