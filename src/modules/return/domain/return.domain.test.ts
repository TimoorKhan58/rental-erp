import { describe, expect, it } from "vitest";

import { Return } from "@/modules/return/domain/return.entity";
import {
  ReturnInvalidItemError,
  ReturnInvalidStatusError,
  ReturnInvariantError,
  createReturnNumber,
} from "@/modules/return/domain/return.errors";
import {
  applyInspectionToItems,
  assertDispatchEligibleForReturn,
  computeReleaseQuantity,
  computeRestockQuantity,
  validateReturnDate,
  validateReturnItems,
  validateReturnItemsAgainstDispatch,
} from "@/modules/return/domain/return.rules";

import {
  ITEM_ID,
  buildCreateReturnData,
  buildInspectedReturnEntity,
  buildReceivedReturnEntity,
  buildReturnEntity,
} from "../tests/helpers/return.fixtures";

describe("Return entity", () => {
  it("creates normalized return props", () => {
    const props = Return.create(buildCreateReturnData());

    expect(props.returnNumber).toBe("RTN-2026-001");
    expect(props.items).toHaveLength(1);
  });

  it("rejects empty return number", () => {
    expect(() =>
      Return.create(buildCreateReturnData({ returnNumber: "   " })),
    ).toThrow(ReturnInvariantError);
  });

  it("rejects empty items", () => {
    expect(() =>
      Return.create(buildCreateReturnData({ items: [] })),
    ).toThrow(ReturnInvariantError);
  });

  it("rejects non-positive quantity", () => {
    expect(() =>
      Return.create(
        buildCreateReturnData({
          items: [{ rentalOrderItemId: ITEM_ID, quantity: 0 }],
        }),
      ),
    ).toThrow(ReturnInvariantError);
  });

  it("rejects duplicate rental order items", () => {
    expect(() =>
      Return.create(
        buildCreateReturnData({
          items: [
            { rentalOrderItemId: ITEM_ID, quantity: 3 },
            { rentalOrderItemId: ITEM_ID, quantity: 2 },
          ],
        }),
      ),
    ).toThrow(ReturnInvariantError);
  });

  it("rejects invalid return date", () => {
    expect(() =>
      Return.create(
        buildCreateReturnData({ returnDate: new Date("invalid") }),
      ),
    ).toThrow(ReturnInvariantError);
  });

  it("reconstitutes persisted return", () => {
    const returnRecord = buildReturnEntity();

    expect(returnRecord.toProps().returnNumber).toBe("RTN-2026-001");
  });

  it("marks draft return as received", () => {
    const returnRecord = buildReturnEntity();
    const received = returnRecord.withReceived();

    expect(received.status).toBe("RECEIVED");
    expect(received.receivedAt).not.toBeNull();
  });

  it("rejects receive when not draft", () => {
    const returnRecord = buildReceivedReturnEntity();

    expect(() => returnRecord.withReceived()).toThrow(ReturnInvalidStatusError);
  });

  it("inspects received return", () => {
    const returnRecord = buildReceivedReturnEntity();
    const inspected = returnRecord.withInspected([
      {
        rentalOrderItemId: ITEM_ID,
        goodQuantity: 3,
        damagedQuantity: 1,
        lostQuantity: 1,
      missingQuantity: 0,
      },
    ]);

    expect(inspected.status).toBe("INSPECTED");
    expect(inspected.inspectedAt).not.toBeNull();
    expect(inspected.items[0]?.goodQuantity).toBe(3);
    expect(inspected.items[0]?.damagedQuantity).toBe(1);
    expect(inspected.items[0]?.lostQuantity).toBe(1);
  });

  it("rejects inspect when not received", () => {
    const returnRecord = buildReturnEntity();

    expect(() =>
      returnRecord.withInspected([
        {
          rentalOrderItemId: ITEM_ID,
          goodQuantity: 5,
          damagedQuantity: 0,
          lostQuantity: 0,
        missingQuantity: 0,
        },
      ]),
    ).toThrow(ReturnInvalidStatusError);
  });

  it("completes inspected return", () => {
    const returnRecord = buildInspectedReturnEntity();
    const completed = returnRecord.withCompleted();

    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).not.toBeNull();
  });

  it("rejects complete when not inspected", () => {
    const returnRecord = buildReceivedReturnEntity();

    expect(() => returnRecord.withCompleted()).toThrow(ReturnInvalidStatusError);
  });

  it("cancels draft return", () => {
    const returnRecord = buildReturnEntity();
    const cancelled = returnRecord.withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
  });

  it("cancels received return", () => {
    const returnRecord = buildReceivedReturnEntity();
    const cancelled = returnRecord.withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
  });

  it("rejects cancel when completed", () => {
    const returnRecord = buildInspectedReturnEntity().withCompleted();

    expect(() => returnRecord.withCancelled()).toThrow(ReturnInvalidStatusError);
  });

  it("assertCanUpdate allows draft only", () => {
    expect(() => buildReturnEntity().assertCanUpdate()).not.toThrow();
    expect(() => buildReceivedReturnEntity().assertCanUpdate()).toThrow(
      ReturnInvalidStatusError,
    );
  });
});

describe("Return rules", () => {
  it("validates return items", () => {
    const items = validateReturnItems([
      { rentalOrderItemId: ITEM_ID, quantity: 5 },
    ]);

    expect(items[0]?.returnedQuantity).toBe(5);
    expect(items[0]?.goodQuantity).toBe(0);
  });

  it("validates return date", () => {
    expect(() => validateReturnDate(new Date("invalid"))).toThrow(
      ReturnInvariantError,
    );
  });

  it("validates items against dispatch", () => {
    expect(() =>
      validateReturnItemsAgainstDispatch(
        [{ rentalOrderItemId: ITEM_ID, quantity: 5 }],
        [
          {
            id: ITEM_ID,
            rentalOrderItemId: ITEM_ID,
            quantity: 5,
          },
        ],
      ),
    ).not.toThrow();
  });

  it("rejects unknown item on dispatch validation", () => {
    expect(() =>
      validateReturnItemsAgainstDispatch(
        [{ rentalOrderItemId: ITEM_ID, quantity: 5 }],
        [],
      ),
    ).toThrow(ReturnInvalidItemError);
  });

  it("rejects quantity exceeding remaining dispatched", () => {
    expect(() =>
      validateReturnItemsAgainstDispatch(
        [{ rentalOrderItemId: ITEM_ID, quantity: 6 }],
        [
          {
            id: ITEM_ID,
            rentalOrderItemId: ITEM_ID,
            quantity: 5,
          },
        ],
      ),
    ).toThrow(ReturnInvalidItemError);
  });

  it("accounts for prior returns when validating quantity", () => {
    const priorReturned = new Map([[ITEM_ID, 3]]);

    expect(() =>
      validateReturnItemsAgainstDispatch(
        [{ rentalOrderItemId: ITEM_ID, quantity: 2 }],
        [
          {
            id: ITEM_ID,
            rentalOrderItemId: ITEM_ID,
            quantity: 5,
          },
        ],
        priorReturned,
      ),
    ).not.toThrow();

    expect(() =>
      validateReturnItemsAgainstDispatch(
        [{ rentalOrderItemId: ITEM_ID, quantity: 4 }],
        [
          {
            id: ITEM_ID,
            rentalOrderItemId: ITEM_ID,
            quantity: 5,
          },
        ],
        priorReturned,
      ),
    ).toThrow(ReturnInvalidItemError);
  });

  it("rejects ineligible dispatch status", () => {
    expect(() => assertDispatchEligibleForReturn("DRAFT")).toThrow(
      ReturnInvalidItemError,
    );
  });

  it("accepts completed dispatch status", () => {
    expect(() => assertDispatchEligibleForReturn("COMPLETED")).not.toThrow();
  });

  it("rejects inspection quantities that do not sum to returned quantity", () => {
    expect(() =>
      applyInspectionToItems(
        [{ ...buildReturnEntity().items[0]!, returnedQuantity: 5 }],
        [
          {
            rentalOrderItemId: ITEM_ID,
            goodQuantity: 3,
            damagedQuantity: 1,
            lostQuantity: 0,
          missingQuantity: 0,
          },
        ],
      ),
    ).toThrow(ReturnInvalidItemError);
  });

  it("rejects negative inspection quantities", () => {
    expect(() =>
      applyInspectionToItems(
        [{ ...buildReturnEntity().items[0]!, returnedQuantity: 5 }],
        [
          {
            rentalOrderItemId: ITEM_ID,
            goodQuantity: -1,
            damagedQuantity: 3,
            lostQuantity: 3,
          missingQuantity: 0,
          },
        ],
      ),
    ).toThrow(ReturnInvalidItemError);
  });

  it("computes restock quantity from good quantity only", () => {
    const item = buildInspectedReturnEntity({
      goodQuantity: 3,
      damagedQuantity: 1,
      lostQuantity: 1,
    }).items[0]!;

    expect(computeRestockQuantity(item)).toBe(3);
  });

  it("computes zero restock when all items are lost", () => {
    const item = buildInspectedReturnEntity({
      goodQuantity: 0,
      damagedQuantity: 0,
      lostQuantity: 5,
    }).items[0]!;

    expect(computeRestockQuantity(item)).toBe(0);
  });

  it("computes release quantity from full returned quantity", () => {
    const item = buildInspectedReturnEntity({
      goodQuantity: 3,
      damagedQuantity: 1,
      lostQuantity: 1,
    }).items[0]!;

    expect(computeReleaseQuantity(item)).toBe(item.returnedQuantity);
  });
});

describe("createReturnNumber", () => {
  it("accepts valid return number", () => {
    expect(createReturnNumber("RTN-001")).toBe("RTN-001");
  });

  it("trims return number", () => {
    expect(createReturnNumber("  RTN-002  ")).toBe("RTN-002");
  });

  it("rejects empty return number", () => {
    expect(() => createReturnNumber("  ")).toThrow(ReturnInvariantError);
  });
});
