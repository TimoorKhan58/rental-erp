import { describe, expect, it, vi } from "vitest";

import { PrismaAssetCategoryRepository } from "@/modules/asset/infrastructure/repositories/prisma-asset-category.repository";
import type { DbClient } from "@/shared/infrastructure/database/prisma-types";
import type { RepositoryRunner } from "@/shared/infrastructure/database";

import {
  CATEGORY_ID,
  buildCategoryEntity,
  buildCreateCategoryData,
} from "../tests/helpers/asset-category.fixtures";

interface AssetCategoryRecord {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function cloneCategoryRecord(record: AssetCategoryRecord): AssetCategoryRecord {
  return {
    ...record,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}

function applyWhereFilter(
  items: AssetCategoryRecord[],
  where?: Record<string, unknown>,
): AssetCategoryRecord[] {
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
        const field = Object.keys(orClause)[0] as keyof AssetCategoryRecord;
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

function createMockCategoryStore(initial: AssetCategoryRecord[] = []) {
  const records = new Map(
    initial.map((record) => [record.id, cloneCategoryRecord(record)]),
  );

  const assetCategory = {
    findUnique: vi.fn(
      async ({
        where,
        select,
      }: {
        where: Record<string, unknown>;
        select?: Record<string, boolean>;
      }) => {
        if (where.id !== undefined) {
          const match = records.get(String(where.id));
          if (!match) {
            return null;
          }
          return select?.id ? { id: match.id } : cloneCategoryRecord(match);
        }

        if (where.name !== undefined) {
          const match = [...records.values()].find(
            (record) => record.name === where.name,
          );
          return match ? cloneCategoryRecord(match) : null;
        }

        return null;
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
          const field = Object.keys(orderBy)[0] as keyof AssetCategoryRecord;
          const direction = orderBy[field] === "desc" ? -1 : 1;
          items.sort((left, right) => {
            const leftValue = left[field] ?? "";
            const rightValue = right[field] ?? "";
            return String(leftValue).localeCompare(String(rightValue)) * direction;
          });
        }

        return items
          .slice(skip ?? 0, (skip ?? 0) + (take ?? items.length))
          .map(cloneCategoryRecord);
      },
    ),
    count: vi.fn(async ({ where }: { where?: Record<string, unknown> }) =>
      applyWhereFilter([...records.values()], where).length,
    ),
    create: vi.fn(
      async ({
        data,
      }: {
        data: Omit<AssetCategoryRecord, "id" | "createdAt" | "updatedAt">;
      }) => {
        const now = new Date();
        const record: AssetCategoryRecord = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        records.set(record.id, cloneCategoryRecord(record));
        return cloneCategoryRecord(record);
      },
    ),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<AssetCategoryRecord>;
      }) => {
        const existing = records.get(where.id);
        if (!existing) {
          throw new Error("not found");
        }

        const updated: AssetCategoryRecord = {
          ...existing,
          ...data,
          updatedAt: new Date(),
        };
        records.set(where.id, updated);
        return cloneCategoryRecord(updated);
      },
    ),
    delete: vi.fn(async ({ where }: { where: { id: string } }) => {
      records.delete(where.id);
      return { id: where.id };
    }),
  };

  return {
    db: { assetCategory } as unknown as DbClient,
    store: records,
    assetCategory,
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

describe("PrismaAssetCategoryRepository", () => {
  const entity = buildCategoryEntity();
  const baseRecord: AssetCategoryRecord = {
    id: CATEGORY_ID,
    name: entity.name,
    description: entity.description,
    isActive: entity.isActive,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };

  it("finds category by id", async () => {
    const { db } = createMockCategoryStore([baseRecord]);
    const repository = new PrismaAssetCategoryRepository(createMockRunner(db));

    const category = await repository.findById(CATEGORY_ID);

    expect(category?.name).toBe("Equipment");
  });

  it("finds category by name", async () => {
    const { db } = createMockCategoryStore([baseRecord]);
    const repository = new PrismaAssetCategoryRepository(createMockRunner(db));

    const category = await repository.findByName("Equipment");

    expect(category?.id).toBe(CATEGORY_ID);
  });

  it("creates category", async () => {
    const { db, store } = createMockCategoryStore();
    const repository = new PrismaAssetCategoryRepository(createMockRunner(db));

    const created = await repository.create(buildCreateCategoryData());

    expect(store.size).toBe(1);
    expect(created.isActive).toBe(true);
  });

  it("updates and deletes categories", async () => {
    const { db, store } = createMockCategoryStore();
    const repository = new PrismaAssetCategoryRepository(createMockRunner(db));

    const created = await repository.create(buildCreateCategoryData());
    expect(store.size).toBe(1);

    const updated = await repository.update(created.id, { name: "Updated" });
    expect(updated.name).toBe("Updated");

    await repository.delete(created.id);
    expect(store.size).toBe(0);
  });

  it("paginates and searches categories", async () => {
    const { db } = createMockCategoryStore([
      baseRecord,
      {
        ...baseRecord,
        id: "aa0e8400-e29b-41d4-a716-446655440099",
        name: "Alpha Vehicles",
      },
    ]);
    const repository = new PrismaAssetCategoryRepository(createMockRunner(db));

    const result = await repository.findPaged({
      page: 1,
      pageSize: 1,
      sortBy: "name",
      sortOrder: "asc",
      search: "Alpha",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Alpha Vehicles");
    expect(result.meta.total).toBe(1);
  });

  it("checks existence without loading full entity", async () => {
    const { db } = createMockCategoryStore([baseRecord]);
    const repository = new PrismaAssetCategoryRepository(createMockRunner(db));

    await expect(repository.exists(CATEGORY_ID)).resolves.toBe(true);
    await expect(
      repository.exists(
        "00000000-0000-0000-0000-000000000099" as typeof CATEGORY_ID,
      ),
    ).resolves.toBe(false);
  });

  it("filters by active status", async () => {
    const { db } = createMockCategoryStore([
      baseRecord,
      {
        ...baseRecord,
        id: "aa0e8400-e29b-41d4-a716-446655440099",
        name: "Inactive",
        isActive: false,
      },
    ]);
    const repository = new PrismaAssetCategoryRepository(createMockRunner(db));

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "asc",
      isActive: false,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.isActive).toBe(false);
  });

  it("maps persisted records to domain entities", async () => {
    const { db } = createMockCategoryStore([baseRecord]);
    const repository = new PrismaAssetCategoryRepository(createMockRunner(db));

    const found = await repository.findByName("Equipment");

    expect(found?.toProps().id).toBe(CATEGORY_ID);
  });
});
