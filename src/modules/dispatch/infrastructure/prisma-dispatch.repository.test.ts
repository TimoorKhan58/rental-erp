import { describe, expect, it, vi } from "vitest";

import { PrismaDispatchRepository } from "@/modules/dispatch/infrastructure/repositories/prisma-dispatch.repository";
import type { DbClient } from "@/shared/infrastructure/database/prisma-types";
import type { RepositoryRunner } from "@/shared/infrastructure/database";

import {
  DISPATCH_ID,
  OTHER_DISPATCH_ID,
  buildCreateDispatchData,
  buildDispatchEntity,
  buildReadyDispatchEntity,
} from "../tests/helpers/dispatch.fixtures";

interface DispatchItemRecord {
  id: string;
  dispatchId: string;
  productId: string;
  rentalOrderItemId: string | null;
  quantity: number;
  notes: string | null;
}

interface DispatchRecord {
  id: string;
  dispatchNumber: string;
  rentalOrderId: string;
  dispatchDate: Date;
  deliveryMethod: string;
  vehicleNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  deliveryAddress: string;
  remarks: string | null;
  status: "DRAFT" | "READY" | "DISPATCHED" | "COMPLETED" | "CANCELLED";
  loadedAt: Date | null;
  departedAt: Date | null;
  deliveredAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  items: DispatchItemRecord[];
}

function cloneRecord(record: DispatchRecord): DispatchRecord {
  return {
    ...record,
    items: record.items.map((item) => ({ ...item })),
  };
}

function createMockDispatchStore(initial: DispatchRecord[] = []) {
  const records = new Map(
    initial.map((record) => [record.id, cloneRecord(record)]),
  );

  const dispatch = {
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
            ([key, value]) => record[key as keyof DispatchRecord] === value,
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
          dispatchNumber: string;
          rentalOrder: { connect: { id: string } };
          dispatchDate: Date;
          deliveryMethod: string;
          vehicleNumber: string | null;
          driverName: string | null;
          driverPhone: string | null;
          deliveryAddress: string;
          remarks: string | null;
          status: DispatchRecord["status"];
          createdBy: { connect: { id: string } };
          items: {
            create: Array<{
              product: { connect: { id: string } };
              rentalOrderItem?: { connect: { id: string } };
              quantity: number;
              notes: string | null;
            }>;
          };
        };
        include?: { items?: boolean };
      }) => {
        const id = crypto.randomUUID();
        const now = new Date();
        const record: DispatchRecord = {
          id,
          dispatchNumber: data.dispatchNumber,
          rentalOrderId: data.rentalOrder.connect.id,
          dispatchDate: data.dispatchDate,
          deliveryMethod: data.deliveryMethod,
          vehicleNumber: data.vehicleNumber,
          driverName: data.driverName,
          driverPhone: data.driverPhone,
          deliveryAddress: data.deliveryAddress,
          remarks: data.remarks,
          status: data.status,
          loadedAt: null,
          departedAt: null,
          deliveredAt: null,
          createdById: data.createdBy.connect.id,
          createdAt: now,
          updatedAt: now,
          items: data.items.create.map((item) => ({
            id: crypto.randomUUID(),
            dispatchId: id,
            productId: item.product.connect.id,
            rentalOrderItemId: item.rentalOrderItem?.connect.id ?? null,
            quantity: item.quantity,
            notes: item.notes,
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
          throw new Error("Dispatch not found");
        }

        const updated: DispatchRecord = {
          ...existing,
          ...(data.status ? { status: data.status as DispatchRecord["status"] } : {}),
          ...(data.loadedAt !== undefined
            ? { loadedAt: data.loadedAt as Date | null }
            : {}),
          ...(data.departedAt !== undefined
            ? { departedAt: data.departedAt as Date | null }
            : {}),
          ...(data.deliveredAt !== undefined
            ? { deliveredAt: data.deliveredAt as Date | null }
            : {}),
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
    db: { dispatch } as unknown as DbClient,
    store: records,
    dispatch,
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

describe("PrismaDispatchRepository", () => {
  const baseRecord = (() => {
    const entity = buildDispatchEntity();
    const props = entity.toProps();

    return {
      id: props.id,
      dispatchNumber: props.dispatchNumber,
      rentalOrderId: props.rentalOrderId,
      dispatchDate: props.dispatchDate,
      deliveryMethod: props.deliveryMethod,
      vehicleNumber: props.vehicleNumber,
      driverName: props.driverName,
      driverPhone: props.driverPhone,
      deliveryAddress: props.deliveryAddress,
      remarks: props.remarks,
      status: props.status,
      loadedAt: props.readyAt,
      departedAt: props.dispatchedAt,
      deliveredAt: props.completedAt,
      createdById: props.createdById,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      items: props.items.map((item) => ({
        id: item.id,
        dispatchId: props.id,
        productId: item.productId,
        rentalOrderItemId: item.rentalOrderItemId,
        quantity: item.quantity,
        notes: item.notes,
      })),
    } satisfies DispatchRecord;
  })();

  it("finds dispatch by id with items", async () => {
    const { db } = createMockDispatchStore([baseRecord]);
    const repository = new PrismaDispatchRepository(createMockRunner(db));

    const found = await repository.findById(DISPATCH_ID);

    expect(found?.dispatchNumber).toBe("DSP-2026-001");
    expect(found?.items).toHaveLength(1);
  });

  it("creates dispatch with items", async () => {
    const { db, store } = createMockDispatchStore();
    const repository = new PrismaDispatchRepository(createMockRunner(db));

    const created = await repository.create(buildCreateDispatchData());

    expect(created.dispatchNumber).toBe("DSP-2026-001");
    expect(created.items).toHaveLength(1);
    expect(store.size).toBe(1);
  });

  it("updates dispatch status", async () => {
    const { db } = createMockDispatchStore([baseRecord]);
    const repository = new PrismaDispatchRepository(createMockRunner(db));
    const readyAt = new Date("2026-01-16T10:00:00.000Z");

    const updated = await repository.updateStatus(DISPATCH_ID, "READY", {
      readyAt,
    });

    expect(updated.status).toBe("READY");
    expect(updated.readyAt).toEqual(readyAt);
  });

  it("paginates dispatches with status filter", async () => {
    const ready = buildReadyDispatchEntity();
    const readyProps = ready.toProps();
    const { db } = createMockDispatchStore([
      baseRecord,
      {
        id: OTHER_DISPATCH_ID,
        dispatchNumber: "DSP-2026-002",
        rentalOrderId: readyProps.rentalOrderId,
        dispatchDate: readyProps.dispatchDate,
        deliveryMethod: readyProps.deliveryMethod,
        vehicleNumber: readyProps.vehicleNumber,
        driverName: readyProps.driverName,
        driverPhone: readyProps.driverPhone,
        deliveryAddress: readyProps.deliveryAddress,
        remarks: readyProps.remarks,
        status: readyProps.status,
        loadedAt: readyProps.readyAt,
        departedAt: readyProps.dispatchedAt,
        deliveredAt: readyProps.completedAt,
        createdById: readyProps.createdById,
        createdAt: readyProps.createdAt,
        updatedAt: readyProps.updatedAt,
        items: [],
      },
    ]);
    const repository = new PrismaDispatchRepository(createMockRunner(db));

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "READY",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("READY");
  });
});
