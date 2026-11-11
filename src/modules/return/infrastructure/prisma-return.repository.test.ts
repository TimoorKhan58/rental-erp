import { describe, expect, it, vi } from "vitest";

import { PrismaReturnRepository } from "@/modules/return/infrastructure/repositories/prisma-return.repository";
import type { ReturnItemProps } from "@/modules/return/domain/return.types";
import type { DbClient } from "@/shared/infrastructure/database/prisma-types";
import type { RepositoryRunner } from "@/shared/infrastructure/database";

import {
  DISPATCH_ID,
  ITEM_ID,
  OTHER_RETURN_ID,
  RENTAL_ORDER_ID,
  RETURN_ID,
  USER_ID,
} from "../tests/helpers/return.fixtures";

const RETURN_ITEM_ID = "ff0e8400-e29b-41d4-a716-446655440000";
const OTHER_RETURN_ITEM_ID = "ff0e8400-e29b-41d4-a716-446655440001";

type ReturnStatus = "DRAFT" | "RECEIVED" | "INSPECTED" | "COMPLETED" | "CANCELLED";

interface ReturnItemRecord {
  id: string;
  returnInspectionId: string;
  rentalOrderItemId: string;
  returnedQuantity: number;
  ownedQuantity: number | null;
  externalQuantity: number | null;
  goodQuantity: number;
  brokenQuantity: number;
  repairQuantity: number;
  lostQuantity: number;
  missingQuantity: number;
  ownedGoodQuantity: number;
  ownedDamagedQuantity: number;
  ownedLostQuantity: number;
  externalGoodQuantity: number;
  externalDamagedQuantity: number;
  externalLostQuantity: number;
  damageCharge: number;
  notes: string | null;
}

interface ReturnRecord {
  id: string;
  returnNumber: string;
  rentalOrderId: string;
  dispatchId: string;
  inspectionDate: Date;
  inspectedById: string;
  remarks: string | null;
  status: ReturnStatus;
  receivedAt: Date | null;
  inspectedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function buildItem(
  id: string,
  returnInspectionId: string,
  returnedQuantity: number,
): ReturnItemRecord {
  return {
    id,
    returnInspectionId,
    rentalOrderItemId: ITEM_ID,
    returnedQuantity,
    ownedQuantity: null,
    externalQuantity: null,
    goodQuantity: 0,
    brokenQuantity: 0,
    repairQuantity: 0,
    lostQuantity: 0,
    missingQuantity: 0,
    ownedGoodQuantity: 0,
    ownedDamagedQuantity: 0,
    ownedLostQuantity: 0,
    externalGoodQuantity: 0,
    externalDamagedQuantity: 0,
    externalLostQuantity: 0,
    damageCharge: 0,
    notes: null,
  };
}

function buildReturn(id: string, status: ReturnStatus): ReturnRecord {
  const now = new Date("2026-02-10T00:00:00.000Z");
  return {
    id,
    returnNumber: `RET-${id.slice(-4)}`,
    rentalOrderId: RENTAL_ORDER_ID,
    dispatchId: DISPATCH_ID,
    inspectionDate: now,
    inspectedById: USER_ID,
    remarks: null,
    status,
    receivedAt: now,
    inspectedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function createMockDb(returns: ReturnRecord[], items: ReturnItemRecord[]) {
  const matches = (record: object, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, value]) => {
      const actual = (record as Record<string, unknown>)[key];
      if (value !== null && typeof value === "object" && "in" in value) {
        return (value as { in: unknown[] }).in.includes(actual);
      }
      return actual === value;
    });

  const db = {
    returnInspection: {
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: Record<string, unknown>;
          data: Partial<ReturnRecord>;
        }) => {
          const hit = returns.filter((record) => matches(record, where));
          hit.forEach((record) => Object.assign(record, data));
          return { count: hit.length };
        },
      ),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const record = returns.find((candidate) => candidate.id === where.id);
        if (!record) {
          return null;
        }
        return {
          ...record,
          items: items
            .filter((item) => item.returnInspectionId === record.id)
            .map((item) => ({ ...item })),
        };
      }),
    },
    returnInspectionItem: {
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: Record<string, unknown>;
          data: Partial<ReturnItemRecord>;
        }) => {
          const hit = items.filter((item) => matches(item, where));
          hit.forEach((item) => Object.assign(item, data));
          return { count: hit.length };
        },
      ),
    },
  };

  return db;
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

function inspectedItem(overrides: Partial<ReturnItemProps>): ReturnItemProps {
  return {
    id: RETURN_ITEM_ID,
    rentalOrderItemId: ITEM_ID,
    dispatchItemId: null,
    returnedQuantity: 4,
    ownedQuantity: null,
    externalQuantity: null,
    goodQuantity: 0,
    damagedQuantity: 0,
    lostQuantity: 0,
    missingQuantity: 0,
    ownedGoodQuantity: 0,
    ownedDamagedQuantity: 0,
    ownedLostQuantity: 0,
    externalGoodQuantity: 0,
    externalDamagedQuantity: 0,
    externalLostQuantity: 0,
    notes: null,
    ...overrides,
  };
}

describe("PrismaReturnRepository.claimStatusTransition", () => {
  it("persists inspection quantities when claiming RECEIVED → INSPECTED (QA-011)", async () => {
    const returns = [buildReturn(RETURN_ID, "RECEIVED")];
    const items = [buildItem(RETURN_ITEM_ID, RETURN_ID, 4)];
    const db = createMockDb(returns, items);
    const repository = new PrismaReturnRepository(
      createMockRunner(db as unknown as DbClient),
    );

    const result = await repository.claimStatusTransition(RETURN_ID, "RECEIVED", {
      status: "INSPECTED",
      inspectedAt: new Date("2026-02-11T00:00:00.000Z"),
      items: [
        inspectedItem({
          goodQuantity: 2,
          damagedQuantity: 1,
          lostQuantity: 1,
          notes: "one torn",
        }),
      ],
    });

    expect(result?.status).toBe("INSPECTED");
    expect(result?.items[0]).toMatchObject({
      goodQuantity: 2,
      damagedQuantity: 1,
      lostQuantity: 1,
      missingQuantity: 0,
      notes: "one torn",
    });
    expect(items[0]).toMatchObject({
      goodQuantity: 2,
      brokenQuantity: 1,
      lostQuantity: 1,
      missingQuantity: 0,
    });
  });

  it("persists source × condition attribution", async () => {
    const returns = [buildReturn(RETURN_ID, "RECEIVED")];
    const items = [buildItem(RETURN_ITEM_ID, RETURN_ID, 5)];
    const db = createMockDb(returns, items);
    const repository = new PrismaReturnRepository(
      createMockRunner(db as unknown as DbClient),
    );

    await repository.claimStatusTransition(RETURN_ID, "RECEIVED", {
      status: "INSPECTED",
      items: [
        inspectedItem({
          returnedQuantity: 5,
          goodQuantity: 4,
          damagedQuantity: 1,
          ownedGoodQuantity: 3,
          ownedDamagedQuantity: 1,
          externalGoodQuantity: 1,
        }),
      ],
    });

    expect(items[0]).toMatchObject({
      ownedGoodQuantity: 3,
      ownedDamagedQuantity: 1,
      ownedLostQuantity: 0,
      externalGoodQuantity: 1,
      externalDamagedQuantity: 0,
      externalLostQuantity: 0,
    });
  });

  it("does not write items when the status claim loses", async () => {
    const returns = [buildReturn(RETURN_ID, "INSPECTED")];
    const items = [buildItem(RETURN_ITEM_ID, RETURN_ID, 4)];
    const db = createMockDb(returns, items);
    const repository = new PrismaReturnRepository(
      createMockRunner(db as unknown as DbClient),
    );

    const result = await repository.claimStatusTransition(RETURN_ID, "RECEIVED", {
      status: "INSPECTED",
      items: [inspectedItem({ goodQuantity: 4 })],
    });

    expect(result).toBeNull();
    expect(items[0]!.goodQuantity).toBe(0);
    expect(db.returnInspectionItem.updateMany).not.toHaveBeenCalled();
  });

  it("only updates items that belong to the claimed return", async () => {
    const returns = [
      buildReturn(RETURN_ID, "RECEIVED"),
      buildReturn(OTHER_RETURN_ID, "RECEIVED"),
    ];
    const items = [
      buildItem(RETURN_ITEM_ID, RETURN_ID, 4),
      buildItem(OTHER_RETURN_ITEM_ID, OTHER_RETURN_ID, 4),
    ];
    const db = createMockDb(returns, items);
    const repository = new PrismaReturnRepository(
      createMockRunner(db as unknown as DbClient),
    );

    await repository.claimStatusTransition(RETURN_ID, "RECEIVED", {
      status: "INSPECTED",
      items: [inspectedItem({ id: OTHER_RETURN_ITEM_ID, goodQuantity: 4 })],
    });

    expect(items[1]!.goodQuantity).toBe(0);
  });

  it("leaves items untouched for status-only transitions", async () => {
    const returns = [buildReturn(RETURN_ID, "DRAFT")];
    const items = [buildItem(RETURN_ITEM_ID, RETURN_ID, 4)];
    const db = createMockDb(returns, items);
    const repository = new PrismaReturnRepository(
      createMockRunner(db as unknown as DbClient),
    );

    const result = await repository.claimStatusTransition(RETURN_ID, "DRAFT", {
      status: "RECEIVED",
      receivedAt: new Date("2026-02-11T00:00:00.000Z"),
    });

    expect(result?.status).toBe("RECEIVED");
    expect(db.returnInspectionItem.updateMany).not.toHaveBeenCalled();
  });
});
