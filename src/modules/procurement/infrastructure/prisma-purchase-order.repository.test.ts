import { Prisma } from "@/generated/prisma/client";
import { describe, expect, it, vi } from "vitest";

import { PrismaPurchaseOrderRepository } from "@/modules/procurement/infrastructure/repositories/prisma-purchase-order.repository";
import type { DbClient } from "@/shared/infrastructure/database/prisma-types";
import type { RepositoryRunner } from "@/shared/infrastructure/database";

import {
  PURCHASE_ORDER_ID,
  buildCreatePurchaseOrderData,
  buildPurchaseOrderEntity,
} from "../tests/helpers/purchase-order.fixtures";

interface PurchaseOrderItemRecord {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  unitCost: Prisma.Decimal;
  receivedQuantity: number;
}

interface PurchaseOrderRecord {
  id: string;
  poNumber: string;
  supplierId: string;
  warehouseId: string;
  status: "DRAFT" | "APPROVED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";
  orderDate: Date;
  expectedDate: Date | null;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: PurchaseOrderItemRecord[];
}

function cloneRecord(record: PurchaseOrderRecord): PurchaseOrderRecord {
  return {
    ...record,
    items: record.items.map((item) => ({ ...item })),
  };
}

function createMockPurchaseOrderStore(initial: PurchaseOrderRecord[] = []) {
  const records = new Map(
    initial.map((record) => [record.id, cloneRecord(record)]),
  );

  const purchaseOrder = {
    findUnique: vi.fn(
      async ({
        where,
        include,
      }: {
        where: Record<string, unknown>;
        include?: { items?: boolean };
      }) => {
        const match = [...records.values()].find((record) =>
          Object.entries(where).every(
            ([key, value]) => record[key as keyof PurchaseOrderRecord] === value,
          ),
        );

        if (!match) {
          return null;
        }

        const result = cloneRecord(match);

        if (!include?.items) {
          const { items: _items, ...rest } = result;
          return rest;
        }

        return result;
      },
    ),
    findMany: vi.fn(
      async ({
        where,
        orderBy,
        skip,
        take,
        include,
      }: {
        where?: Record<string, unknown>;
        orderBy?: Record<string, "asc" | "desc">;
        skip?: number;
        take?: number;
        include?: { items?: boolean };
      }) => {
        let items = [...records.values()];

        if (where?.status) {
          items = items.filter((item) => item.status === where.status);
        }

        if (orderBy?.createdAt) {
          const direction = orderBy.createdAt === "desc" ? -1 : 1;
          items.sort(
            (left, right) =>
              (left.createdAt.getTime() - right.createdAt.getTime()) * direction,
          );
        }

        const sliced = items.slice(skip ?? 0, (skip ?? 0) + (take ?? items.length));

        return sliced.map((record) => {
          const clone = cloneRecord(record);
          if (!include?.items) {
            const { items: _items, ...rest } = clone;
            return rest;
          }
          return clone;
        });
      },
    ),
    count: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
      let items = [...records.values()];

      if (where?.status) {
        items = items.filter((item) => item.status === where.status);
      }

      return items.length;
    }),
    create: vi.fn(
      async ({
        data,
        include,
      }: {
        data: {
          poNumber: string;
          supplier: { connect: { id: string } };
          warehouse: { connect: { id: string } };
          status: PurchaseOrderRecord["status"];
          orderDate: Date;
          expectedDate: Date | null;
          remarks: string | null;
          items: {
            create: Array<{
              product: { connect: { id: string } };
              quantity: number;
              unitCost: Prisma.Decimal;
              receivedQuantity: number;
            }>;
          };
        };
        include?: { items?: boolean };
      }) => {
        const id = crypto.randomUUID();
        const now = new Date();
        const record: PurchaseOrderRecord = {
          id,
          poNumber: data.poNumber,
          supplierId: data.supplier.connect.id,
          warehouseId: data.warehouse.connect.id,
          status: data.status,
          orderDate: data.orderDate,
          expectedDate: data.expectedDate,
          remarks: data.remarks,
          createdAt: now,
          updatedAt: now,
          items: data.items.create.map((item) => ({
            id: crypto.randomUUID(),
            purchaseOrderId: id,
            productId: item.product.connect.id,
            quantity: item.quantity,
            unitCost: item.unitCost,
            receivedQuantity: item.receivedQuantity,
          })),
        };

        records.set(id, record);

        if (!include?.items) {
          const { items: _items, ...rest } = record;
          return rest;
        }

        return cloneRecord(record);
      },
    ),
    update: vi.fn(
      async ({
        where,
        data,
        include,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
        include?: { items?: boolean };
      }) => {
        const existing = records.get(where.id);

        if (!existing) {
          throw new Error("Purchase order not found");
        }

        const updated: PurchaseOrderRecord = {
          ...existing,
          ...(data.status ? { status: data.status as PurchaseOrderRecord["status"] } : {}),
          updatedAt: new Date(),
        };

        records.set(where.id, updated);

        if (!include?.items) {
          const { items: _items, ...rest } = updated;
          return rest;
        }

        return cloneRecord(updated);
      },
    ),
  };

  return {
    db: { purchaseOrder } as unknown as DbClient,
    store: records,
    purchaseOrder,
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

describe("PrismaPurchaseOrderRepository", () => {
  const baseRecord = (() => {
    const entity = buildPurchaseOrderEntity();
    const props = entity.toProps();

    return {
      id: props.id,
      poNumber: props.poNumber,
      supplierId: props.supplierId,
      warehouseId: props.warehouseId,
      status: props.status,
      orderDate: props.orderDate,
      expectedDate: props.expectedDate,
      remarks: props.remarks,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      items: props.items.map((item) => ({
        id: item.id,
        purchaseOrderId: props.id,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: new Prisma.Decimal(item.unitCost),
        receivedQuantity: item.receivedQuantity,
      })),
    } satisfies PurchaseOrderRecord;
  })();

  it("finds purchase order by id with items", async () => {
    const { db } = createMockPurchaseOrderStore([baseRecord]);
    const repository = new PrismaPurchaseOrderRepository(createMockRunner(db));

    const found = await repository.findById(PURCHASE_ORDER_ID);

    expect(found?.poNumber).toBe("PO-2026-001");
    expect(found?.items).toHaveLength(1);
  });

  it("creates purchase order with items", async () => {
    const { db, store } = createMockPurchaseOrderStore();
    const repository = new PrismaPurchaseOrderRepository(createMockRunner(db));

    const created = await repository.create(buildCreatePurchaseOrderData());

    expect(created.poNumber).toBe("PO-2026-001");
    expect(created.items).toHaveLength(1);
    expect(store.size).toBe(1);
  });

  it("updates purchase order status", async () => {
    const { db } = createMockPurchaseOrderStore([baseRecord]);
    const repository = new PrismaPurchaseOrderRepository(createMockRunner(db));

    const updated = await repository.updateStatus(PURCHASE_ORDER_ID, "APPROVED");

    expect(updated.status).toBe("APPROVED");
  });

  it("paginates purchase orders with status filter", async () => {
    const approved = buildPurchaseOrderEntity({
      id: "aa0e8400-e29b-41d4-a716-446655440002" as typeof PURCHASE_ORDER_ID,
      status: "APPROVED",
    });
    const approvedProps = approved.toProps();
    const { db } = createMockPurchaseOrderStore([
      baseRecord,
      {
        id: approvedProps.id,
        poNumber: "PO-2026-002",
        supplierId: approvedProps.supplierId,
        warehouseId: approvedProps.warehouseId,
        status: approvedProps.status,
        orderDate: approvedProps.orderDate,
        expectedDate: approvedProps.expectedDate,
        remarks: approvedProps.remarks,
        createdAt: approvedProps.createdAt,
        updatedAt: approvedProps.updatedAt,
        items: [],
      },
    ]);
    const repository = new PrismaPurchaseOrderRepository(createMockRunner(db));

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "APPROVED",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("APPROVED");
  });
});
