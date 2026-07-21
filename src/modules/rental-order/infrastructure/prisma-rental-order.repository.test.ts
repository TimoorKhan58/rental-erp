import { Prisma } from "@/generated/prisma/client";
import { describe, expect, it, vi } from "vitest";

import { PrismaRentalOrderRepository } from "@/modules/rental-order/infrastructure/repositories/prisma-rental-order.repository";
import type { DbClient } from "@/shared/infrastructure/database/prisma-types";
import type { RepositoryRunner } from "@/shared/infrastructure/database";

import {
  RENTAL_ORDER_ID,
  buildCreateRentalOrderData,
  buildRentalOrderEntity,
} from "../tests/helpers/rental-order.fixtures";
import type { RentalOrderStatus } from "@/modules/rental-order/domain/rental-order.constants";

interface RentalOrderItemRecord {
  id: string;
  rentalOrderId: string;
  productId: string;
  quantity: number;
  rentalPricePerDay: Prisma.Decimal;
  reservedQuantity: number;
  numberOfDays: number;
  lineTotal: Prisma.Decimal;
}

interface RentalOrderRecord {
  id: string;
  orderNumber: string;
  customerId: string;
  warehouseId: string;
  status: RentalOrderStatus;
  eventStartDate: Date;
  eventEndDate: Date;
  notes: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  items: RentalOrderItemRecord[];
}

function cloneRecord(record: RentalOrderRecord): RentalOrderRecord {
  return {
    ...record,
    items: record.items.map((item) => ({ ...item })),
  };
}

function createMockRentalOrderStore(initial: RentalOrderRecord[] = []) {
  const records = new Map(
    initial.map((record) => [record.id, cloneRecord(record)]),
  );

  const rentalOrder = {
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
            ([key, value]) => record[key as keyof RentalOrderRecord] === value,
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
          orderNumber: string;
          customer: { connect: { id: string } };
          warehouse: { connect: { id: string } };
          status: RentalOrderRecord["status"];
          eventStartDate: Date;
          eventEndDate: Date;
          notes: string | null;
          createdBy: { connect: { id: string } };
          items: {
            create: Array<{
              product: { connect: { id: string } };
              quantity: number;
              rentalPricePerDay: Prisma.Decimal;
              reservedQuantity: number;
              numberOfDays: number;
              lineTotal: Prisma.Decimal;
            }>;
          };
        };
        include?: { items?: boolean };
      }) => {
        const id = crypto.randomUUID();
        const now = new Date();
        const record: RentalOrderRecord = {
          id,
          orderNumber: data.orderNumber,
          customerId: data.customer.connect.id,
          warehouseId: data.warehouse.connect.id,
          status: data.status,
          eventStartDate: data.eventStartDate,
          eventEndDate: data.eventEndDate,
          notes: data.notes,
          createdById: data.createdBy.connect.id,
          createdAt: now,
          updatedAt: now,
          items: data.items.create.map((item) => ({
            id: crypto.randomUUID(),
            rentalOrderId: id,
            productId: item.product.connect.id,
            quantity: item.quantity,
            rentalPricePerDay: item.rentalPricePerDay,
            reservedQuantity: item.reservedQuantity,
            numberOfDays: item.numberOfDays,
            lineTotal: item.lineTotal,
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
          throw new Error("Rental order not found");
        }

        const updated: RentalOrderRecord = {
          ...existing,
          ...(data.status ? { status: data.status as RentalOrderRecord["status"] } : {}),
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
    db: { rentalOrder } as unknown as DbClient,
    store: records,
    rentalOrder,
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

describe("PrismaRentalOrderRepository", () => {
  const baseRecord = (() => {
    const entity = buildRentalOrderEntity();
    const props = entity.toProps();

    return {
      id: props.id,
      orderNumber: props.orderNumber,
      customerId: props.customerId,
      warehouseId: props.warehouseId,
      status: props.status,
      eventStartDate: props.startDate,
      eventEndDate: props.endDate,
      notes: props.remarks,
      createdById: props.createdById,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      items: props.items.map((item) => ({
        id: item.id,
        rentalOrderId: props.id,
        productId: item.productId,
        quantity: item.quantity,
        rentalPricePerDay: new Prisma.Decimal(item.dailyRate),
        reservedQuantity: item.reservedQuantity,
        numberOfDays: 4,
        lineTotal: new Prisma.Decimal(item.quantity * item.dailyRate * 4),
      })),
    } satisfies RentalOrderRecord;
  })();

  it("finds rental order by id with items", async () => {
    const { db } = createMockRentalOrderStore([baseRecord]);
    const repository = new PrismaRentalOrderRepository(createMockRunner(db));

    const found = await repository.findById(RENTAL_ORDER_ID);

    expect(found?.orderNumber).toBe("RO-2026-001");
    expect(found?.items).toHaveLength(1);
  });

  it("creates rental order with items", async () => {
    const { db, store } = createMockRentalOrderStore();
    const repository = new PrismaRentalOrderRepository(createMockRunner(db));

    const created = await repository.create(buildCreateRentalOrderData());

    expect(created.orderNumber).toBe("RO-2026-001");
    expect(created.items).toHaveLength(1);
    expect(store.size).toBe(1);
  });

  it("updates rental order status", async () => {
    const { db } = createMockRentalOrderStore([baseRecord]);
    const repository = new PrismaRentalOrderRepository(createMockRunner(db));

    const updated = await repository.updateStatus(RENTAL_ORDER_ID, "CONFIRMED");

    expect(updated.status).toBe("CONFIRMED");
  });

  it("paginates rental orders with status filter", async () => {
    const confirmed = buildRentalOrderEntity({
      id: "aa0e8400-e29b-41d4-a716-446655440002" as typeof RENTAL_ORDER_ID,
      status: "CONFIRMED",
    });
    const confirmedProps = confirmed.toProps();
    const { db } = createMockRentalOrderStore([
      baseRecord,
      {
        id: confirmedProps.id,
        orderNumber: "RO-2026-002",
        customerId: confirmedProps.customerId,
        warehouseId: confirmedProps.warehouseId,
        status: confirmedProps.status,
        eventStartDate: confirmedProps.startDate,
        eventEndDate: confirmedProps.endDate,
        notes: confirmedProps.remarks,
        createdById: confirmedProps.createdById,
        createdAt: confirmedProps.createdAt,
        updatedAt: confirmedProps.updatedAt,
        items: [],
      },
    ]);
    const repository = new PrismaRentalOrderRepository(createMockRunner(db));

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "CONFIRMED",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("CONFIRMED");
  });
});
