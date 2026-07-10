import { Prisma } from "@/generated/prisma/client";
import { describe, expect, it, vi } from "vitest";

import { PrismaAssetRepository } from "@/modules/asset/infrastructure/repositories/prisma-asset.repository";
import type { DbClient } from "@/shared/infrastructure/database/prisma-types";
import type { RepositoryRunner } from "@/shared/infrastructure/database";

import {
  ASSET_ID,
  CATEGORY_ID,
  OTHER_WAREHOUSE_ID,
  USER_ID,
  WAREHOUSE_ID,
  buildCreateAssetData,
  buildAssetEntity,
} from "../tests/helpers/asset.fixtures";

interface AssetRecord {
  id: string;
  assetCode: string;
  name: string;
  categoryId: string;
  serialNumber: string | null;
  purchaseDate: Date;
  purchaseCost: Prisma.Decimal;
  residualValue: Prisma.Decimal;
  usefulLifeMonths: number;
  currentBookValue: Prisma.Decimal;
  warehouseId: string;
  assignedEmployeeId: string | null;
  vendorId: string | null;
  notes: string | null;
  status: string;
  disposalDate: Date | null;
  disposalAmount: Prisma.Decimal | null;
  disposalReason: string | null;
  disposedById: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

function normalizeDecimal(
  value: Prisma.Decimal | number | string | null | undefined,
): Prisma.Decimal | null {
  if (value === null || value === undefined) {
    return null;
  }

  return value instanceof Prisma.Decimal
    ? new Prisma.Decimal(value.toString())
    : new Prisma.Decimal(String(value));
}

function cloneAssetRecord(record: AssetRecord): AssetRecord {
  return {
    ...record,
    purchaseCost: new Prisma.Decimal(record.purchaseCost.toString()),
    residualValue: new Prisma.Decimal(record.residualValue.toString()),
    currentBookValue: new Prisma.Decimal(record.currentBookValue.toString()),
    disposalAmount:
      record.disposalAmount !== null
        ? new Prisma.Decimal(record.disposalAmount.toString())
        : null,
    purchaseDate: new Date(record.purchaseDate),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
    disposalDate:
      record.disposalDate !== null ? new Date(record.disposalDate) : null,
  };
}

function flattenAssetCreateData(
  data: Record<string, unknown>,
): Omit<AssetRecord, "id" | "createdAt" | "updatedAt"> {
  const category = data.category as { connect?: { id: string } } | undefined;
  const warehouse = data.warehouse as { connect?: { id: string } } | undefined;
  const createdBy = data.createdBy as { connect?: { id: string } } | undefined;

  return {
    assetCode: String(data.assetCode),
    name: String(data.name),
    categoryId: category?.connect?.id ?? String(data.categoryId),
    serialNumber: (data.serialNumber as string | null | undefined) ?? null,
    purchaseDate: data.purchaseDate as Date,
    purchaseCost: normalizeDecimal(
      data.purchaseCost as Prisma.Decimal,
    ) as Prisma.Decimal,
    residualValue: normalizeDecimal(
      data.residualValue as Prisma.Decimal,
    ) as Prisma.Decimal,
    usefulLifeMonths: Number(data.usefulLifeMonths),
    currentBookValue: normalizeDecimal(
      data.currentBookValue as Prisma.Decimal,
    ) as Prisma.Decimal,
    warehouseId: warehouse?.connect?.id ?? String(data.warehouseId),
    assignedEmployeeId: null,
    vendorId: null,
    notes: (data.notes as string | null | undefined) ?? null,
    status: String(data.status ?? "ACTIVE"),
    disposalDate: null,
    disposalAmount: null,
    disposalReason: null,
    disposedById: null,
    createdById: createdBy?.connect?.id ?? String(data.createdById),
  };
}

function flattenTransferCreateData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const asset = data.asset as { connect?: { id: string } } | undefined;
  const fromWarehouse = data.fromWarehouse as
    | { connect?: { id: string } }
    | undefined;
  const toWarehouse = data.toWarehouse as
    | { connect?: { id: string } }
    | undefined;
  const transferredBy = data.transferredBy as
    | { connect?: { id: string } }
    | undefined;

  return {
    assetId: asset?.connect?.id ?? data.assetId,
    fromWarehouseId: fromWarehouse?.connect?.id ?? data.fromWarehouseId,
    toWarehouseId: toWarehouse?.connect?.id ?? data.toWarehouseId,
    transferDate: data.transferDate,
    reason: data.reason ?? null,
    transferredById: transferredBy?.connect?.id ?? data.transferredById,
  };
}

function flattenMaintenanceCreateData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const asset = data.asset as { connect?: { id: string } } | undefined;
  const completedBy = data.completedBy as
    | { connect?: { id: string } }
    | undefined;

  return {
    assetId: asset?.connect?.id ?? data.assetId,
    serviceDate: data.serviceDate,
    vendor: data.vendor ?? null,
    cost: data.cost,
    description: data.description,
    completedById: completedBy?.connect?.id ?? data.completedById,
  };
}

function applyWhereFilter(
  items: AssetRecord[],
  where?: Record<string, unknown>,
): AssetRecord[] {
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
        const field = Object.keys(orClause)[0] as keyof AssetRecord;
        const contains = orClause[field]?.contains.toLowerCase();
        const value = item[field];
        return value !== null && String(value).toLowerCase().includes(contains ?? "");
      }),
    );
  }

  if (where.status !== undefined) {
    return items.filter((item) => item.status === where.status);
  }

  if (where.categoryId !== undefined) {
    return items.filter((item) => item.categoryId === where.categoryId);
  }

  if (where.warehouseId !== undefined) {
    return items.filter((item) => item.warehouseId === where.warehouseId);
  }

  return items;
}

function createMockAssetStore(initial: AssetRecord[] = []) {
  const records = new Map(
    initial.map((record) => [record.id, cloneAssetRecord(record)]),
  );
  const transfers: Array<Record<string, unknown>> = [];
  const maintenance: Array<Record<string, unknown>> = [];

  const asset = {
    findUnique: vi.fn(
      async ({
        where,
      }: {
        where: Record<string, unknown>;
      }) => {
        if (where.id !== undefined) {
          const match = records.get(String(where.id));
          return match ? cloneAssetRecord(match) : null;
        }

        if (where.assetCode !== undefined) {
          const match = [...records.values()].find(
            (record) => record.assetCode === where.assetCode,
          );
          return match ? cloneAssetRecord(match) : null;
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
          const field = Object.keys(orderBy)[0] as keyof AssetRecord;
          const direction = orderBy[field] === "desc" ? -1 : 1;
          items.sort((left, right) => {
            const leftValue = left[field] ?? "";
            const rightValue = right[field] ?? "";
            return String(leftValue).localeCompare(String(rightValue)) * direction;
          });
        }

        return items
          .slice(skip ?? 0, (skip ?? 0) + (take ?? items.length))
          .map(cloneAssetRecord);
      },
    ),
    count: vi.fn(async ({ where }: { where?: Record<string, unknown> }) =>
      applyWhereFilter([...records.values()], where).length,
    ),
    create: vi.fn(
      async ({
        data,
      }: {
        data: Record<string, unknown>;
      }) => {
        const now = new Date();
        const record: AssetRecord = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...flattenAssetCreateData(data),
        };
        records.set(record.id, cloneAssetRecord(record));
        return cloneAssetRecord(record);
      },
    ),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<AssetRecord>;
      }) => {
        const existing = records.get(where.id);
        if (!existing) {
          throw new Error("not found");
        }

        const updated: AssetRecord = {
          ...existing,
          ...data,
          updatedAt: new Date(),
        };
        records.set(where.id, updated);
        return cloneAssetRecord(updated);
      },
    ),
  };

  const assetTransfer = {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const record = {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        ...flattenTransferCreateData(data),
      };
      transfers.push(record);
      return record;
    }),
    findMany: vi.fn(async ({ where }: { where: { assetId: string } }) =>
      transfers.filter((record) => record.assetId === where.assetId),
    ),
  };

  const assetMaintenanceHistory = {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const record = {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        ...flattenMaintenanceCreateData(data),
      };
      maintenance.push(record);
      return record;
    }),
    findMany: vi.fn(async ({ where }: { where: { assetId: string } }) =>
      maintenance.filter((record) => record.assetId === where.assetId),
    ),
  };

  return {
    db: { asset, assetTransfer, assetMaintenanceHistory } as unknown as DbClient,
    store: records,
    asset,
    assetTransfer,
    assetMaintenanceHistory,
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

describe("PrismaAssetRepository", () => {
  const entity = buildAssetEntity();
  const baseRecord: AssetRecord = {
    id: ASSET_ID,
    assetCode: entity.assetCode,
    name: entity.name,
    categoryId: CATEGORY_ID,
    serialNumber: entity.serialNumber,
    purchaseDate: entity.purchaseDate,
    purchaseCost: new Prisma.Decimal(entity.purchaseCost),
    residualValue: new Prisma.Decimal(entity.residualValue),
    usefulLifeMonths: entity.usefulLifeMonths,
    currentBookValue: new Prisma.Decimal(entity.currentBookValue),
    warehouseId: WAREHOUSE_ID,
    assignedEmployeeId: null,
    vendorId: null,
    notes: entity.notes,
    status: "ACTIVE",
    disposalDate: null,
    disposalAmount: null,
    disposalReason: null,
    disposedById: null,
    createdById: USER_ID,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };

  it("finds asset by id", async () => {
    const { db } = createMockAssetStore([baseRecord]);
    const repository = new PrismaAssetRepository(createMockRunner(db));

    const asset = await repository.findById(ASSET_ID);

    expect(asset?.name).toBe("Forklift Model X");
    expect(asset?.purchaseCost).toBe(500000);
  });

  it("finds asset by code", async () => {
    const { db } = createMockAssetStore([baseRecord]);
    const repository = new PrismaAssetRepository(createMockRunner(db));

    const asset = await repository.findByAssetCode("AST-001");

    expect(asset?.id).toBe(ASSET_ID);
  });

  it("creates with active status and initial book value", async () => {
    const { db, store, asset } = createMockAssetStore();
    const repository = new PrismaAssetRepository(createMockRunner(db));

    const created = await repository.create(buildCreateAssetData());

    expect(store.size).toBe(1);
    expect(asset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ACTIVE",
        }),
      }),
    );
    expect(created.status).toBe("ACTIVE");
    expect(created.currentBookValue).toBe(created.purchaseCost);
  });

  it("creates, updates, and maps domain entities", async () => {
    const { db, store } = createMockAssetStore();
    const repository = new PrismaAssetRepository(createMockRunner(db));

    const created = await repository.create(buildCreateAssetData());
    expect(store.size).toBe(1);

    const updated = await repository.update(created.id, { name: "Updated" });
    expect(updated.name).toBe("Updated");
  });

  it("paginates, searches, and filters assets", async () => {
    const { db } = createMockAssetStore([
      baseRecord,
      {
        ...baseRecord,
        id: "aa0e8400-e29b-41d4-a716-446655440099",
        assetCode: "AST-002",
        name: "Alpha Crane",
      },
    ]);
    const repository = new PrismaAssetRepository(createMockRunner(db));

    const result = await repository.findPaged({
      page: 1,
      pageSize: 1,
      sortBy: "name",
      sortOrder: "asc",
      search: "Alpha",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Alpha Crane");
    expect(result.meta.total).toBe(1);
  });

  it("creates transfer records", async () => {
    const { db, assetTransfer } = createMockAssetStore([baseRecord]);
    const repository = new PrismaAssetRepository(createMockRunner(db));

    await repository.createTransfer({
      assetId: ASSET_ID,
      fromWarehouseId: WAREHOUSE_ID,
      toWarehouseId: OTHER_WAREHOUSE_ID,
      transferDate: new Date("2026-01-20"),
      transferredById: USER_ID,
    });

    expect(assetTransfer.create).toHaveBeenCalledOnce();
  });

  it("creates maintenance history records", async () => {
    const { db, assetMaintenanceHistory } = createMockAssetStore([baseRecord]);
    const repository = new PrismaAssetRepository(createMockRunner(db));

    await repository.createMaintenanceHistory(ASSET_ID, {
      serviceDate: new Date("2026-01-25"),
      cost: 1500,
      description: "Inspection",
      completedById: USER_ID,
    });

    expect(assetMaintenanceHistory.create).toHaveBeenCalledOnce();
  });

  it("finds transfers and maintenance by asset id", async () => {
    const { db } = createMockAssetStore([baseRecord]);
    const repository = new PrismaAssetRepository(createMockRunner(db));

    await repository.createTransfer({
      assetId: ASSET_ID,
      fromWarehouseId: WAREHOUSE_ID,
      toWarehouseId: OTHER_WAREHOUSE_ID,
      transferDate: new Date("2026-01-20"),
      transferredById: USER_ID,
    });
    await repository.createMaintenanceHistory(ASSET_ID, {
      serviceDate: new Date("2026-01-25"),
      cost: 1500,
      description: "Inspection",
      completedById: USER_ID,
    });

    const transfers = await repository.findTransfersByAssetId(ASSET_ID);
    const maintenance = await repository.findMaintenanceHistoryByAssetId(
      ASSET_ID,
    );

    expect(transfers).toHaveLength(1);
    expect(maintenance).toHaveLength(1);
  });

  it("uses transaction client via runner.withTransaction", async () => {
    const { db } = createMockAssetStore([baseRecord]);
    const txDb = createMockAssetStore([baseRecord]).db;
    const runner: RepositoryRunner = {
      get db() {
        return db;
      },
      run: <T>(operation: (client: DbClient) => Promise<T>) => operation(txDb),
      withTransaction: () => createMockRunner(txDb),
    };
    const repository = new PrismaAssetRepository(runner);

    const asset = await repository.findById(ASSET_ID);

    expect(asset).not.toBeNull();
    expect(runner.withTransaction(txDb).db).toBe(txDb);
  });
});

describe("PrismaAssetRepository mapping", () => {
  it("maps persisted records to domain entities", async () => {
    const entity = buildAssetEntity();
    const record: AssetRecord = {
      id: entity.id,
      assetCode: entity.assetCode,
      name: entity.name,
      categoryId: CATEGORY_ID,
      serialNumber: entity.serialNumber,
      purchaseDate: entity.purchaseDate,
      purchaseCost: new Prisma.Decimal(entity.purchaseCost),
      residualValue: new Prisma.Decimal(entity.residualValue),
      usefulLifeMonths: entity.usefulLifeMonths,
      currentBookValue: new Prisma.Decimal(entity.currentBookValue),
      warehouseId: WAREHOUSE_ID,
      assignedEmployeeId: null,
      vendorId: null,
      notes: entity.notes,
      status: "ACTIVE",
      disposalDate: null,
      disposalAmount: null,
      disposalReason: null,
      disposedById: null,
      createdById: USER_ID,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    const { db } = createMockAssetStore([record]);
    const repository = new PrismaAssetRepository(createMockRunner(db));

    const found = await repository.findByAssetCode("AST-001");

    expect(found?.toProps().id).toBe(entity.id);
  });
});
