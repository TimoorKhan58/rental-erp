import { Prisma } from "@/generated/prisma/client";
import { describe, expect, it, vi } from "vitest";

import { PrismaProductRepository } from "@/modules/product/infrastructure/repositories/prisma-product.repository";
import type { DbClient } from "@/shared/infrastructure/database/prisma-types";
import type { RepositoryRunner } from "@/shared/infrastructure/database";

import {
  createProductName,
} from "@/modules/product/domain";

import {
  PRODUCT_ID,
  buildCreateProductData,
  buildProductEntity,
} from "../tests/helpers/product.fixtures";

interface MockProductRow {
  id: string;
  productCode: string;
  categoryId: string | null;
  brandId: string | null;
  unitId: string | null;
  name: string;
  description: string | null;
  purchaseCost: Prisma.Decimal;
  rentalPricePerDay: Prisma.Decimal;
  totalQuantity: number;
  minimumStock: number;
  unit: string;
  isRentable: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type MockProductDetailRow = MockProductRow & {
  tagAssignments: Array<{ tagId: string }>;
  images: [];
  specifications: [];
  attributeValues: [];
  _count: { variants: number };
};

function withProductDetails(record: MockProductRow): MockProductDetailRow {
  return {
    ...cloneProductRecord(record),
    brandId: record.brandId ?? null,
    unitId: record.unitId ?? null,
    tagAssignments: [],
    images: [],
    specifications: [],
    attributeValues: [],
    _count: { variants: 0 },
  };
}

function cloneProductRecord(record: MockProductRow): MockProductRow {
  return {
    ...record,
    purchaseCost: new Prisma.Decimal(record.purchaseCost.toString()),
    rentalPricePerDay: new Prisma.Decimal(record.rentalPricePerDay.toString()),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}

function clonePartialProductRecord(
  data: Partial<MockProductRow>,
): Partial<MockProductRow> {
  return {
    ...data,
    ...(data.purchaseCost !== undefined
      ? { purchaseCost: new Prisma.Decimal(data.purchaseCost.toString()) }
      : {}),
    ...(data.rentalPricePerDay !== undefined
      ? {
          rentalPricePerDay: new Prisma.Decimal(
            data.rentalPricePerDay.toString(),
          ),
        }
      : {}),
  };
}

function applyWhereFilter(
  items: MockProductRow[],
  where?: Record<string, unknown>,
): MockProductRow[] {
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
        const field = Object.keys(orClause)[0] as keyof MockProductRow;
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

function createMockProductStore(initial: MockProductRow[] = []) {
  const records = new Map(initial.map((record) => [record.id, cloneProductRecord(record)]));

  const product = {
    findUnique: vi.fn(async ({ where, select, include }: { where: Record<string, unknown>; select?: Record<string, boolean>; include?: unknown }) => {
      const match = [...records.values()].find((record) =>
        Object.entries(where).every(([key, value]) => record[key as keyof MockProductRow] === value),
      );

      if (!match) {
        return null;
      }

      if (select?.id) {
        return { id: match.id };
      }

      const cloned = cloneProductRecord(match);
      return include ? withProductDetails(cloned) : cloned;
    }),
    findMany: vi.fn(async ({ where, orderBy, skip, take, include }: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, string>;
      skip?: number;
      take?: number;
      include?: unknown;
    }) => {
      const items = applyWhereFilter([...records.values()], where);

      if (orderBy) {
        const field = Object.keys(orderBy)[0] as keyof MockProductRow;
        const direction = orderBy[field] === "desc" ? -1 : 1;
        items.sort((left, right) => {
          const leftValue = left[field] ?? "";
          const rightValue = right[field] ?? "";
          const leftComparable =
            leftValue instanceof Prisma.Decimal
              ? leftValue.toNumber()
              : String(leftValue);
          const rightComparable =
            rightValue instanceof Prisma.Decimal
              ? rightValue.toNumber()
              : String(rightValue);
          return String(leftComparable).localeCompare(String(rightComparable)) * direction;
        });
      }

      return items
        .slice(skip ?? 0, (skip ?? 0) + (take ?? items.length))
        .map((item) => (include ? withProductDetails(item) : cloneProductRecord(item)));
    }),
    count: vi.fn(async ({ where }: { where?: Record<string, unknown> }) =>
      applyWhereFilter([...records.values()], where).length,
    ),
    create: vi.fn(async ({ data, include }: { data: Omit<MockProductRow, "id" | "createdAt" | "updatedAt">; include?: unknown }) => {
      const now = new Date();
      const record: MockProductRow = {
        id: crypto.randomUUID(),
        brandId: null,
        unitId: null,
        createdAt: now,
        updatedAt: now,
        ...clonePartialProductRecord(data),
      } as MockProductRow;
      records.set(record.id, record);
      const cloned = cloneProductRecord(record);
      return include ? withProductDetails(cloned) : cloned;
    }),
    update: vi.fn(async ({ where, data, include }: { where: { id: string }; data: Partial<MockProductRow>; include?: unknown }) => {
      const existing = records.get(where.id);
      if (!existing) {
        throw new Error("not found");
      }

      const normalized = clonePartialProductRecord(data);
      const updated: MockProductRow = {
        ...existing,
        ...normalized,
        updatedAt: new Date(),
      };
      records.set(where.id, updated);
      const cloned = cloneProductRecord(updated);
      return include ? withProductDetails(cloned) : cloned;
    }),
    delete: vi.fn(async ({ where }: { where: { id: string } }) => {
      records.delete(where.id);
      return { id: where.id };
    }),
  };

  return {
    db: { product } as unknown as DbClient,
    store: records,
    product,
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

describe("PrismaProductRepository", () => {
  const baseRecord: MockProductRow = {
    id: PRODUCT_ID,
    productCode: "PROD-001",
    categoryId: null,
    brandId: null,
    unitId: null,
    name: "Wedding Tent 20x40",
    description: "Large wedding tent suitable for outdoor events",
    purchaseCost: new Prisma.Decimal(50000),
    rentalPricePerDay: new Prisma.Decimal(1500),
    totalQuantity: 0,
    minimumStock: 0,
    unit: "day",
    isRentable: true,
    isActive: true,
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-01-15T10:00:00.000Z"),
  };

  it("finds product by id", async () => {
    const { db } = createMockProductStore([baseRecord]);
    const repository = new PrismaProductRepository(createMockRunner(db));

    const product = await repository.findById(PRODUCT_ID);

    expect(product?.product.name).toBe("Wedding Tent 20x40");
    expect(product?.product.rentalRate).toBe(1500);
    expect(product?.product.replacementCost).toBe(50000);
  });

  it("creates with default inventory fields", async () => {
    const { db, store, product } = createMockProductStore();
    const repository = new PrismaProductRepository(createMockRunner(db));

    const created = await repository.create(buildCreateProductData());

    expect(store.size).toBe(1);
    expect([...store.values()][0]?.categoryId ?? null).toBeNull();
    expect(product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalQuantity: 0,
          minimumStock: 0,
          isRentable: true,
        }),
      }),
    );
    expect(created.product.rentalRate).toBe(1500);
  });

  it("creates, updates, and deletes products", async () => {
    const { db, store } = createMockProductStore();
    const repository = new PrismaProductRepository(createMockRunner(db));

    const created = await repository.create(buildCreateProductData());
    expect(store.size).toBe(1);

    const updated = await repository.update(created.product.id, {
      name: createProductName("Updated"),
    });
    expect(updated.product.name).toBe("Updated");

    await repository.delete(created.product.id);
    expect(store.size).toBe(0);
  });

  it("paginates, searches, and sorts products", async () => {
    const { db } = createMockProductStore([
      baseRecord,
      {
        ...baseRecord,
        id: "770e8400-e29b-41d4-a716-446655440001",
        productCode: "PROD-002",
        name: "Alpha Chairs",
        rentalPricePerDay: new Prisma.Decimal(200),
        purchaseCost: new Prisma.Decimal(1000),
      },
    ]);
    const repository = new PrismaProductRepository(createMockRunner(db));

    const result = await repository.findPaged({
      page: 1,
      pageSize: 1,
      sortBy: "name",
      sortOrder: "asc",
      search: "Alpha",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.product.name).toBe("Alpha Chairs");
    expect(result.meta.total).toBe(1);
  });

  it("maps rentalRate sort to rentalPricePerDay", async () => {
    const { db } = createMockProductStore([
      baseRecord,
      {
        ...baseRecord,
        id: "770e8400-e29b-41d4-a716-446655440001",
        productCode: "PROD-002",
        name: "Cheap Item",
        rentalPricePerDay: new Prisma.Decimal(100),
      },
    ]);
    const repository = new PrismaProductRepository(createMockRunner(db));

    const result = await repository.findPaged({
      page: 1,
      pageSize: 2,
      sortBy: "rentalRate",
      sortOrder: "asc",
    });

    expect(result.items[0]?.product.rentalRate).toBe(100);
  });

  it("uses transaction client via runner.withTransaction", async () => {
    const { db } = createMockProductStore([baseRecord]);
    const txDb = createMockProductStore([baseRecord]).db;
    const runner: RepositoryRunner = {
      get db() {
        return db;
      },
      run: <T>(operation: (client: DbClient) => Promise<T>) => operation(txDb),
      withTransaction: () => createMockRunner(txDb),
    };
    const repository = new PrismaProductRepository(runner);

    const product = await repository.findById(PRODUCT_ID);

    expect(product).not.toBeNull();
    expect(runner.withTransaction(txDb).db).toBe(txDb);
  });

  it("checks existence without loading full entity", async () => {
    const { db } = createMockProductStore([baseRecord]);
    const repository = new PrismaProductRepository(createMockRunner(db));

    await expect(repository.exists(PRODUCT_ID)).resolves.toBe(true);
    await expect(
      repository.exists("770e8400-e29b-41d4-a716-446655440099" as typeof PRODUCT_ID),
    ).resolves.toBe(false);
  });
});

describe("PrismaProductRepository mapping", () => {
  it("maps persisted records to domain entities", async () => {
    const entity = buildProductEntity();
    const record: MockProductRow = {
      id: entity.id,
      productCode: entity.productCode,
      categoryId: null,
      brandId: null,
      unitId: null,
      name: entity.name,
      description: entity.description,
      purchaseCost: new Prisma.Decimal(entity.replacementCost ?? 0),
      rentalPricePerDay: new Prisma.Decimal(entity.rentalRate),
      totalQuantity: 0,
      minimumStock: 0,
      unit: entity.unit,
      isRentable: true,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    const { db } = createMockProductStore([record]);
    const repository = new PrismaProductRepository(createMockRunner(db));

    const found = await repository.findByProductCode("PROD-001");

    expect(found?.product.toProps().id).toBe(entity.id);
  });

  it("maps zero purchase cost to null replacement cost", async () => {
    const record: MockProductRow = {
      id: PRODUCT_ID,
      productCode: "PROD-003",
      categoryId: null,
      brandId: null,
      unitId: null,
      name: "No Cost Item",
      description: null,
      purchaseCost: new Prisma.Decimal(0),
      rentalPricePerDay: new Prisma.Decimal(500),
      totalQuantity: 0,
      minimumStock: 0,
      unit: "day",
      isRentable: true,
      isActive: true,
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
      updatedAt: new Date("2026-01-15T10:00:00.000Z"),
    };
    const { db } = createMockProductStore([record]);
    const repository = new PrismaProductRepository(createMockRunner(db));

    const found = await repository.findById(PRODUCT_ID);

    expect(found?.product.replacementCost).toBeNull();
  });
});
