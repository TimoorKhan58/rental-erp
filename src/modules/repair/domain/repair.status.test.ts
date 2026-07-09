import { describe, expect, it } from "vitest";

import { Repair } from "@/modules/repair/domain/repair.entity";
import {
  assertCanCancel,
  assertCanComplete,
  assertCanStart,
  assertCanUpdate,
} from "@/modules/repair/domain/repair.rules";
import { RepairInvalidStatusError } from "@/modules/repair/domain/repair.errors";

import {
  buildCompletedRepairEntity,
  buildCreateRepairData,
  buildInProgressRepairEntity,
  buildRepairEntity,
} from "../tests/helpers/repair.fixtures";

describe("status transition guards", () => {
  it("assertCanUpdate allows pending", () => {
    expect(() => assertCanUpdate("PENDING")).not.toThrow();
  });

  it("assertCanUpdate rejects in progress", () => {
    expect(() => assertCanUpdate("IN_PROGRESS")).toThrow(
      RepairInvalidStatusError,
    );
  });

  it("assertCanStart allows pending", () => {
    expect(() => assertCanStart("PENDING")).not.toThrow();
  });

  it("assertCanStart rejects in progress", () => {
    expect(() => assertCanStart("IN_PROGRESS")).toThrow(
      RepairInvalidStatusError,
    );
  });

  it("assertCanComplete allows in progress", () => {
    expect(() => assertCanComplete("IN_PROGRESS")).not.toThrow();
  });

  it("assertCanComplete rejects pending", () => {
    expect(() => assertCanComplete("PENDING")).toThrow(
      RepairInvalidStatusError,
    );
  });

  it("assertCanCancel allows pending", () => {
    expect(() => assertCanCancel("PENDING")).not.toThrow();
  });

  it("assertCanCancel allows in progress", () => {
    expect(() => assertCanCancel("IN_PROGRESS")).not.toThrow();
  });

  it("assertCanCancel rejects completed", () => {
    expect(() => assertCanCancel("COMPLETED")).toThrow(
      RepairInvalidStatusError,
    );
  });

  it("assertCanCancel rejects cancelled", () => {
    expect(() => assertCanCancel("CANCELLED")).toThrow(
      RepairInvalidStatusError,
    );
  });
});

describe("repair entity edge cases", () => {
  it("transitions through full workflow", () => {
    const pending = buildRepairEntity();
    const inProgress = pending.withStarted();
    const completed = inProgress.withCompleted();

    expect(completed.status).toBe("COMPLETED");
    expect(completed.startedAt).not.toBeNull();
    expect(completed.completedAt).not.toBeNull();
  });

  it("rejects cancel on completed entity", () => {
    const completed = buildCompletedRepairEntity();

    expect(() => completed.withCancelled()).toThrow(RepairInvalidStatusError);
  });

  it("rejects cancel on cancelled entity", () => {
    const cancelled = buildRepairEntity().withCancelled();

    expect(() => cancelled.withCancelled()).toThrow(RepairInvalidStatusError);
  });

  it("normalizes optional notes to null on create", () => {
    const props = Repair.create(
      buildCreateRepairData({ repairNotes: "   ", technician: "  " }),
    );

    expect(props.repairNotes).toBeNull();
    expect(props.technician).toBeNull();
  });

  it("allows cancel from pending before start", () => {
    const cancelled = buildRepairEntity().withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.startedAt).toBeNull();
  });

  it("allows cancel from in progress", () => {
    const cancelled = buildInProgressRepairEntity().withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
  });
});
