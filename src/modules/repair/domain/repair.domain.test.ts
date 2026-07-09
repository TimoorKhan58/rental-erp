import { describe, expect, it } from "vitest";

import { Repair } from "@/modules/repair/domain/repair.entity";
import {
  RepairInvalidItemError,
  RepairInvalidStatusError,
  RepairInvariantError,
  createRepairNumber,
} from "@/modules/repair/domain/repair.errors";
import {
  assertReturnEligibleForRepair,
  validateRepairCost,
  validateRepairDate,
  validateRepairQuantity,
  validateRepairQuantityAgainstReturn,
} from "@/modules/repair/domain/repair.rules";

import {
  ITEM_ID,
  buildCreateRepairData,
  buildCompletedRepairEntity,
  buildInProgressRepairEntity,
  buildRepairEntity,
} from "../tests/helpers/repair.fixtures";

describe("Repair entity", () => {
  it("creates normalized repair props", () => {
    const props = Repair.create(buildCreateRepairData());

    expect(props.repairNumber).toBe("RPR-2026-001");
    expect(props.quantity).toBe(1);
  });

  it("rejects empty repair number", () => {
    expect(() =>
      Repair.create(buildCreateRepairData({ repairNumber: "   " })),
    ).toThrow(RepairInvariantError);
  });

  it("rejects non-positive quantity", () => {
    expect(() =>
      Repair.create(buildCreateRepairData({ quantity: 0 })),
    ).toThrow(RepairInvariantError);
  });

  it("rejects negative repair cost", () => {
    expect(() =>
      Repair.create(buildCreateRepairData({ repairCost: -1 })),
    ).toThrow(RepairInvariantError);
  });

  it("rejects invalid repair date", () => {
    expect(() =>
      Repair.create(buildCreateRepairData({ repairDate: new Date("invalid") })),
    ).toThrow(RepairInvariantError);
  });

  it("reconstitutes persisted repair", () => {
    const repair = buildRepairEntity();

    expect(repair.toProps().repairNumber).toBe("RPR-2026-001");
  });

  it("normalizes optional notes to null", () => {
    const props = Repair.create(
      buildCreateRepairData({ repairNotes: "   ", technician: "  " }),
    );

    expect(props.repairNotes).toBeNull();
    expect(props.technician).toBeNull();
  });

  it("updates pending repair", () => {
    const repair = buildRepairEntity();
    const updated = repair.withUpdated({
      repairCost: 75,
      repairNotes: "Updated notes",
      quantity: 2,
    });

    expect(updated.repairCost).toBe(75);
    expect(updated.repairNotes).toBe("Updated notes");
    expect(updated.quantity).toBe(2);
  });

  it("rejects update when not pending", () => {
    const repair = buildInProgressRepairEntity();

    expect(() => repair.withUpdated({ repairCost: 75 })).toThrow(
      RepairInvalidStatusError,
    );
  });

  it("starts pending repair", () => {
    const repair = buildRepairEntity();
    const started = repair.withStarted();

    expect(started.status).toBe("IN_PROGRESS");
    expect(started.startedAt).not.toBeNull();
  });

  it("rejects start when not pending", () => {
    const repair = buildInProgressRepairEntity();

    expect(() => repair.withStarted()).toThrow(RepairInvalidStatusError);
  });

  it("completes in-progress repair", () => {
    const repair = buildInProgressRepairEntity();
    const completed = repair.withCompleted();

    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).not.toBeNull();
  });

  it("rejects complete when not in progress", () => {
    const repair = buildRepairEntity();

    expect(() => repair.withCompleted()).toThrow(RepairInvalidStatusError);
  });

  it("cancels pending repair", () => {
    const repair = buildRepairEntity();
    const cancelled = repair.withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
  });

  it("cancels in-progress repair", () => {
    const repair = buildInProgressRepairEntity();
    const cancelled = repair.withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
  });

  it("rejects cancel when completed", () => {
    const repair = buildCompletedRepairEntity();

    expect(() => repair.withCancelled()).toThrow(RepairInvalidStatusError);
  });

  it("rejects cancel when already cancelled", () => {
    const repair = buildRepairEntity().withCancelled();

    expect(() => repair.withCancelled()).toThrow(RepairInvalidStatusError);
  });

  it("assertCanUpdate allows pending only", () => {
    expect(() => buildRepairEntity().assertCanUpdate()).not.toThrow();
    expect(() => buildInProgressRepairEntity().assertCanUpdate()).toThrow(
      RepairInvalidStatusError,
    );
  });
});

describe("Repair rules", () => {
  it("validates repair quantity", () => {
    expect(() => validateRepairQuantity(5)).not.toThrow();
    expect(() => validateRepairQuantity(0)).toThrow(RepairInvariantError);
  });

  it("validates repair cost", () => {
    expect(() => validateRepairCost(0)).not.toThrow();
    expect(() => validateRepairCost(-1)).toThrow(RepairInvariantError);
  });

  it("validates repair date", () => {
    expect(() => validateRepairDate(new Date("invalid"))).toThrow(
      RepairInvariantError,
    );
  });

  it("accepts completed return for repair", () => {
    expect(() => assertReturnEligibleForRepair("COMPLETED")).not.toThrow();
  });

  it("rejects non-completed return for repair", () => {
    expect(() => assertReturnEligibleForRepair("INSPECTED")).toThrow(
      RepairInvalidItemError,
    );
  });

  it("validates repair quantity against damaged quantity", () => {
    expect(() =>
      validateRepairQuantityAgainstReturn(1, 2, 0, ITEM_ID),
    ).not.toThrow();
  });

  it("rejects repair quantity exceeding remaining damaged", () => {
    expect(() =>
      validateRepairQuantityAgainstReturn(3, 2, 0, ITEM_ID),
    ).toThrow(RepairInvalidItemError);
  });

  it("accounts for prior repaired quantity", () => {
    expect(() =>
      validateRepairQuantityAgainstReturn(1, 2, 1, ITEM_ID),
    ).not.toThrow();

    expect(() =>
      validateRepairQuantityAgainstReturn(2, 2, 1, ITEM_ID),
    ).toThrow(RepairInvalidItemError);
  });

  it("rejects repair when no damaged quantity", () => {
    expect(() =>
      validateRepairQuantityAgainstReturn(1, 0, 0, ITEM_ID),
    ).toThrow(RepairInvalidItemError);
  });
});

describe("createRepairNumber", () => {
  it("accepts valid repair number", () => {
    expect(createRepairNumber("RPR-001")).toBe("RPR-001");
  });

  it("trims repair number", () => {
    expect(createRepairNumber("  RPR-002  ")).toBe("RPR-002");
  });

  it("rejects empty repair number", () => {
    expect(() => createRepairNumber("  ")).toThrow(RepairInvariantError);
  });
});
