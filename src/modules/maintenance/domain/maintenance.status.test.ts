import { describe, expect, it } from "vitest";

import { Maintenance } from "@/modules/maintenance/domain/maintenance.entity";
import {
  assertCanCancel,
  assertCanComplete,
  assertCanStart,
  assertCanUpdate,
} from "@/modules/maintenance/domain/maintenance.rules";
import { MaintenanceInvalidStatusError } from "@/modules/maintenance/domain/maintenance.errors";

import {
  buildCompletedMaintenanceEntity,
  buildCreateMaintenanceData,
  buildInProgressMaintenanceEntity,
  buildMaintenanceEntity,
} from "../tests/helpers/maintenance.fixtures";

describe("status transition guards", () => {
  it("assertCanUpdate allows scheduled", () => {
    expect(() => assertCanUpdate("SCHEDULED")).not.toThrow();
  });

  it("assertCanUpdate rejects in progress", () => {
    expect(() => assertCanUpdate("IN_PROGRESS")).toThrow(
      MaintenanceInvalidStatusError,
    );
  });

  it("assertCanUpdate rejects completed", () => {
    expect(() => assertCanUpdate("COMPLETED")).toThrow(
      MaintenanceInvalidStatusError,
    );
  });

  it("assertCanStart allows scheduled", () => {
    expect(() => assertCanStart("SCHEDULED")).not.toThrow();
  });

  it("assertCanStart rejects in progress", () => {
    expect(() => assertCanStart("IN_PROGRESS")).toThrow(
      MaintenanceInvalidStatusError,
    );
  });

  it("assertCanComplete allows in progress", () => {
    expect(() => assertCanComplete("IN_PROGRESS")).not.toThrow();
  });

  it("assertCanComplete rejects scheduled", () => {
    expect(() => assertCanComplete("SCHEDULED")).toThrow(
      MaintenanceInvalidStatusError,
    );
  });

  it("assertCanCancel allows scheduled", () => {
    expect(() => assertCanCancel("SCHEDULED")).not.toThrow();
  });

  it("assertCanCancel allows in progress", () => {
    expect(() => assertCanCancel("IN_PROGRESS")).not.toThrow();
  });

  it("assertCanCancel rejects completed", () => {
    expect(() => assertCanCancel("COMPLETED")).toThrow(
      MaintenanceInvalidStatusError,
    );
  });

  it("assertCanCancel rejects cancelled", () => {
    expect(() => assertCanCancel("CANCELLED")).toThrow(
      MaintenanceInvalidStatusError,
    );
  });
});

describe("maintenance entity edge cases", () => {
  it("transitions through full workflow", () => {
    const scheduled = buildMaintenanceEntity();
    const inProgress = scheduled.withStarted();
    const completed = inProgress.withCompleted();

    expect(completed.status).toBe("COMPLETED");
    expect(completed.startedAt).not.toBeNull();
    expect(completed.completedAt).not.toBeNull();
  });

  it("rejects cancel on completed entity", () => {
    const completed = buildCompletedMaintenanceEntity();

    expect(() => completed.withCancelled()).toThrow(
      MaintenanceInvalidStatusError,
    );
  });

  it("rejects cancel on cancelled entity", () => {
    const cancelled = buildMaintenanceEntity().withCancelled();

    expect(() => cancelled.withCancelled()).toThrow(
      MaintenanceInvalidStatusError,
    );
  });

  it("normalizes optional text to null on create", () => {
    const props = Maintenance.create(
      buildCreateMaintenanceData({ notes: "   ", technician: "  " }),
    );

    expect(props.notes).toBeNull();
    expect(props.technician).toBeNull();
  });

  it("allows cancel from scheduled before start", () => {
    const cancelled = buildMaintenanceEntity().withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.startedAt).toBeNull();
  });

  it("allows cancel from in progress", () => {
    const cancelled = buildInProgressMaintenanceEntity().withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
  });

  it("rejects start from completed", () => {
    const completed = buildCompletedMaintenanceEntity();

    expect(() => completed.withStarted()).toThrow(MaintenanceInvalidStatusError);
  });

  it("rejects complete from scheduled", () => {
    const scheduled = buildMaintenanceEntity();

    expect(() => scheduled.withCompleted()).toThrow(
      MaintenanceInvalidStatusError,
    );
  });
});
