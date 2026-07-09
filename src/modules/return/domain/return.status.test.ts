import { describe, expect, it } from "vitest";

import { Return } from "@/modules/return/domain/return.entity";
import {
  assertCanCancel,
  assertCanComplete,
  assertCanInspect,
  assertCanReceive,
  assertCanUpdate,
} from "@/modules/return/domain/return.rules";
import { ReturnInvalidStatusError } from "@/modules/return/domain/return.errors";

import {
  ITEM_ID,
  buildCompletedReturnEntity,
  buildCreateReturnData,
  buildReturnEntity,
} from "../tests/helpers/return.fixtures";

describe("status transition guards", () => {
  it("assertCanUpdate allows draft", () => {
    expect(() => assertCanUpdate("DRAFT")).not.toThrow();
  });

  it("assertCanUpdate rejects received", () => {
    expect(() => assertCanUpdate("RECEIVED")).toThrow(ReturnInvalidStatusError);
  });

  it("assertCanReceive allows draft", () => {
    expect(() => assertCanReceive("DRAFT")).not.toThrow();
  });

  it("assertCanReceive rejects received", () => {
    expect(() => assertCanReceive("RECEIVED")).toThrow(
      ReturnInvalidStatusError,
    );
  });

  it("assertCanInspect allows received", () => {
    expect(() => assertCanInspect("RECEIVED")).not.toThrow();
  });

  it("assertCanInspect rejects draft", () => {
    expect(() => assertCanInspect("DRAFT")).toThrow(ReturnInvalidStatusError);
  });

  it("assertCanComplete allows inspected", () => {
    expect(() => assertCanComplete("INSPECTED")).not.toThrow();
  });

  it("assertCanComplete rejects received", () => {
    expect(() => assertCanComplete("RECEIVED")).toThrow(
      ReturnInvalidStatusError,
    );
  });

  it("assertCanCancel allows draft", () => {
    expect(() => assertCanCancel("DRAFT")).not.toThrow();
  });

  it("assertCanCancel allows received", () => {
    expect(() => assertCanCancel("RECEIVED")).not.toThrow();
  });

  it("assertCanCancel allows inspected", () => {
    expect(() => assertCanCancel("INSPECTED")).not.toThrow();
  });

  it("assertCanCancel rejects completed", () => {
    expect(() => assertCanCancel("COMPLETED")).toThrow(
      ReturnInvalidStatusError,
    );
  });

  it("assertCanCancel rejects cancelled", () => {
    expect(() => assertCanCancel("CANCELLED")).toThrow(
      ReturnInvalidStatusError,
    );
  });
});

describe("return entity edge cases", () => {
  it("transitions through full workflow", () => {
    const draft = buildReturnEntity();
    const received = draft.withReceived();
    const inspected = received.withInspected([
      {
        rentalOrderItemId: ITEM_ID,
        goodQuantity: 3,
        damagedQuantity: 1,
        lostQuantity: 1,
      },
    ]);
    const completed = inspected.withCompleted();

    expect(completed.status).toBe("COMPLETED");
    expect(completed.receivedAt).not.toBeNull();
    expect(completed.inspectedAt).not.toBeNull();
    expect(completed.completedAt).not.toBeNull();
  });

  it("rejects cancel on completed entity", () => {
    const completed = buildCompletedReturnEntity();

    expect(() => completed.withCancelled()).toThrow(ReturnInvalidStatusError);
  });

  it("rejects cancel on cancelled entity", () => {
    const cancelled = buildReturnEntity().withCancelled();

    expect(() => cancelled.withCancelled()).toThrow(ReturnInvalidStatusError);
  });

  it("normalizes optional remarks to null", () => {
    const returnRecord = Return.create(
      buildCreateReturnData({ remarks: "   " }),
    );

    expect(returnRecord.remarks).toBeNull();
  });
});
