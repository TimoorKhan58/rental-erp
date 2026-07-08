import { describe, expect, it, vi } from "vitest";

import { PrismaCustomerRepository } from "@/modules/customer/infrastructure/repositories/prisma-customer.repository";
import type { DbClient } from "@/shared/infrastructure/database/prisma-types";
import type { RepositoryRunner } from "@/shared/infrastructure/database";

import {
  CUSTOMER_ID,
  buildCreateCustomerData,
  buildCustomerEntity,
} from "../tests/helpers/customer.fixtures";

interface CustomerRecord {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  cnic: string | null;
  address: string;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function applyWhereFilter(
  items: CustomerRecord[],
  where?: Record<string, unknown>,
): CustomerRecord[] {
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
        const field = Object.keys(orClause)[0] as keyof CustomerRecord;
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

function createMockCustomerStore(initial: CustomerRecord[] = []) {
  const records = new Map(initial.map((record) => [record.id, structuredClone(record)]));

  const customer = {
    findUnique: vi.fn(async ({ where, select }: { where: Record<string, unknown>; select?: Record<string, boolean> }) => {
      const match = [...records.values()].find((record) =>
        Object.entries(where).every(([key, value]) => record[key as keyof CustomerRecord] === value),
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
        const field = Object.keys(orderBy)[0] as keyof CustomerRecord;
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
    create: vi.fn(async ({ data }: { data: Omit<CustomerRecord, "id" | "createdAt" | "updatedAt"> }) => {
      const now = new Date();
      const record: CustomerRecord = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      records.set(record.id, record);
      return structuredClone(record);
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<CustomerRecord> }) => {
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
    db: { customer } as unknown as DbClient,
    store: records,
    customer,
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

describe("PrismaCustomerRepository", () => {
  const baseRecord: CustomerRecord = {
    id: CUSTOMER_ID,
    customerCode: "CUST-001",
    name: "Manyar Tent Service",
    phone: "+923001234567",
    cnic: "12345-1234567-1",
    address: "123 Main Street, Lahore",
    notes: null,
    isActive: true,
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-01-15T10:00:00.000Z"),
  };

  it("finds customer by id", async () => {
    const { db } = createMockCustomerStore([baseRecord]);
    const repository = new PrismaCustomerRepository(createMockRunner(db));

    const customer = await repository.findById(CUSTOMER_ID);

    expect(customer?.name).toBe("Manyar Tent Service");
  });

  it("creates, updates, and deletes customers", async () => {
    const { db, store } = createMockCustomerStore();
    const repository = new PrismaCustomerRepository(createMockRunner(db));

    const created = await repository.create(buildCreateCustomerData());
    expect(store.size).toBe(1);

    const updated = await repository.update(created.id, { name: "Updated" });
    expect(updated.name).toBe("Updated");

    await repository.delete(created.id);
    expect(store.size).toBe(0);
  });

  it("paginates, searches, and sorts customers", async () => {
    const { db } = createMockCustomerStore([
      baseRecord,
      {
        ...baseRecord,
        id: "550e8400-e29b-41d4-a716-446655440001",
        customerCode: "CUST-002",
        phone: "+923009999999",
        name: "Alpha Rentals",
      },
    ]);
    const repository = new PrismaCustomerRepository(createMockRunner(db));

    const result = await repository.findPaged({
      page: 1,
      pageSize: 1,
      sortBy: "name",
      sortOrder: "asc",
      search: "Alpha",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Alpha Rentals");
    expect(result.meta.total).toBe(1);
  });

  it("uses transaction client via runner.withTransaction", async () => {
    const { db } = createMockCustomerStore([baseRecord]);
    const txDb = createMockCustomerStore([baseRecord]).db;
    const runner: RepositoryRunner = {
      get db() {
        return db;
      },
      run: <T>(operation: (client: DbClient) => Promise<T>) => operation(txDb),
      withTransaction: () => createMockRunner(txDb),
    };
    const repository = new PrismaCustomerRepository(runner);

    const customer = await repository.findById(CUSTOMER_ID);

    expect(customer).not.toBeNull();
    expect(runner.withTransaction(txDb).db).toBe(txDb);
  });

  it("checks existence without loading full entity", async () => {
    const { db } = createMockCustomerStore([baseRecord]);
    const repository = new PrismaCustomerRepository(createMockRunner(db));

    await expect(repository.exists(CUSTOMER_ID)).resolves.toBe(true);
    await expect(
      repository.exists("550e8400-e29b-41d4-a716-446655440099" as typeof CUSTOMER_ID),
    ).resolves.toBe(false);
  });
});

describe("PrismaCustomerRepository mapping", () => {
  it("maps persisted records to domain entities", async () => {
    const entity = buildCustomerEntity();
    const record: CustomerRecord = {
      id: entity.id,
      customerCode: entity.customerCode,
      name: entity.name,
      phone: entity.phone,
      cnic: entity.cnic,
      address: entity.address,
      notes: entity.notes,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    const { db } = createMockCustomerStore([record]);
    const repository = new PrismaCustomerRepository(createMockRunner(db));

    const found = await repository.findByCustomerCode("CUST-001");

    expect(found?.toProps().id).toBe(entity.id);
  });
});
