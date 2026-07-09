import { describe, expect, it } from "vitest";

import { Maintenance } from "@/modules/maintenance/domain/maintenance.entity";
import {
  MaintenanceInvalidInventoryError,
  MaintenanceInvalidStatusError,
  MaintenanceInvariantError,
  createMaintenanceNumber,
} from "@/modules/maintenance/domain/maintenance.errors";
import {
  validateMaintenanceCost,
  validateMaintenanceQuantity,
  validateQuantityAgainstAvailable,
  validateScheduledDate,
  validateServiceType,
} from "@/modules/maintenance/domain/maintenance.rules";

import {
  INVENTORY_ID,
  buildCreateMaintenanceData,
  buildCompletedMaintenanceEntity,
  buildInProgressMaintenanceEntity,
  buildMaintenanceEntity,
} from "../tests/helpers/maintenance.fixtures";

describe("Maintenance entity", () => {
  it("creates normalized maintenance props", () => {
    const props = Maintenance.create(buildCreateMaintenanceData());

    expect(props.maintenanceNumber).toBe("MNT-2026-001");
    expect(props.quantity).toBe(2);
    expect(props.serviceType).toBe("PREVENTIVE");
  });

  it("rejects empty maintenance number", () => {
    expect(() =>
      Maintenance.create(
        buildCreateMaintenanceData({ maintenanceNumber: "   " }),
      ),
    ).toThrow(MaintenanceInvariantError);
  });

  it("rejects non-positive quantity", () => {
    expect(() =>
      Maintenance.create(buildCreateMaintenanceData({ quantity: 0 })),
    ).toThrow(MaintenanceInvariantError);
  });

  it("rejects negative estimated cost", () => {
    expect(() =>
      Maintenance.create(buildCreateMaintenanceData({ estimatedCost: -1 })),
    ).toThrow(MaintenanceInvariantError);
  });

  it("rejects negative actual cost", () => {
    expect(() =>
      Maintenance.create(buildCreateMaintenanceData({ actualCost: -1 })),
    ).toThrow(MaintenanceInvariantError);
  });

  it("rejects invalid scheduled date", () => {
    expect(() =>
      Maintenance.create(
        buildCreateMaintenanceData({ scheduledDate: new Date("invalid") }),
      ),
    ).toThrow(MaintenanceInvariantError);
  });

  it("rejects invalid service type", () => {
    expect(() =>
      Maintenance.create(
        buildCreateMaintenanceData({ serviceType: "INVALID" as never }),
      ),
    ).toThrow(MaintenanceInvariantError);
  });

  it("reconstitutes persisted maintenance", () => {
    const maintenance = buildMaintenanceEntity();

    expect(maintenance.toProps().maintenanceNumber).toBe("MNT-2026-001");
  });

  it("normalizes optional text fields to null", () => {
    const props = Maintenance.create(
      buildCreateMaintenanceData({
        notes: "   ",
        technician: "  ",
        vendor: "  ",
      }),
    );

    expect(props.notes).toBeNull();
    expect(props.technician).toBeNull();
    expect(props.vendor).toBeNull();
  });

  it("updates scheduled maintenance", () => {
    const maintenance = buildMaintenanceEntity();
    const updated = maintenance.withUpdated({
      estimatedCost: 150,
      notes: "Updated notes",
      quantity: 1,
      serviceType: "INSPECTION",
    });

    expect(updated.estimatedCost).toBe(150);
    expect(updated.notes).toBe("Updated notes");
    expect(updated.quantity).toBe(1);
    expect(updated.serviceType).toBe("INSPECTION");
  });

  it("rejects update when not scheduled", () => {
    const maintenance = buildInProgressMaintenanceEntity();

    expect(() => maintenance.withUpdated({ estimatedCost: 150 })).toThrow(
      MaintenanceInvalidStatusError,
    );
  });

  it("starts scheduled maintenance", () => {
    const maintenance = buildMaintenanceEntity();
    const started = maintenance.withStarted();

    expect(started.status).toBe("IN_PROGRESS");
    expect(started.startedAt).not.toBeNull();
  });

  it("rejects start when not scheduled", () => {
    const maintenance = buildInProgressMaintenanceEntity();

    expect(() => maintenance.withStarted()).toThrow(
      MaintenanceInvalidStatusError,
    );
  });

  it("completes in-progress maintenance", () => {
    const maintenance = buildInProgressMaintenanceEntity();
    const completed = maintenance.withCompleted();

    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).not.toBeNull();
  });

  it("rejects complete when not in progress", () => {
    const maintenance = buildMaintenanceEntity();

    expect(() => maintenance.withCompleted()).toThrow(
      MaintenanceInvalidStatusError,
    );
  });

  it("cancels scheduled maintenance", () => {
    const maintenance = buildMaintenanceEntity();
    const cancelled = maintenance.withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
  });

  it("cancels in-progress maintenance", () => {
    const maintenance = buildInProgressMaintenanceEntity();
    const cancelled = maintenance.withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
  });

  it("rejects cancel when completed", () => {
    const maintenance = buildCompletedMaintenanceEntity();

    expect(() => maintenance.withCancelled()).toThrow(
      MaintenanceInvalidStatusError,
    );
  });

  it("rejects cancel when already cancelled", () => {
    const maintenance = buildMaintenanceEntity().withCancelled();

    expect(() => maintenance.withCancelled()).toThrow(
      MaintenanceInvalidStatusError,
    );
  });

  it("assertCanUpdate allows scheduled only", () => {
    expect(() => buildMaintenanceEntity().assertCanUpdate()).not.toThrow();
    expect(() => buildInProgressMaintenanceEntity().assertCanUpdate()).toThrow(
      MaintenanceInvalidStatusError,
    );
  });
});

describe("Maintenance rules", () => {
  it("validates maintenance quantity", () => {
    expect(() => validateMaintenanceQuantity(5)).not.toThrow();
    expect(() => validateMaintenanceQuantity(0)).toThrow(
      MaintenanceInvariantError,
    );
  });

  it("validates maintenance cost", () => {
    expect(() => validateMaintenanceCost(0, "estimatedCost")).not.toThrow();
    expect(() => validateMaintenanceCost(-1, "estimatedCost")).toThrow(
      MaintenanceInvariantError,
    );
  });

  it("validates scheduled date", () => {
    expect(() => validateScheduledDate(new Date("invalid"))).toThrow(
      MaintenanceInvariantError,
    );
  });

  it("validates service type", () => {
    expect(validateServiceType("PREVENTIVE")).toBe("PREVENTIVE");
    expect(() => validateServiceType("INVALID")).toThrow(
      MaintenanceInvariantError,
    );
  });

  it("validates quantity against available inventory", () => {
    expect(() =>
      validateQuantityAgainstAvailable(2, 5, INVENTORY_ID),
    ).not.toThrow();
  });

  it("rejects quantity exceeding available inventory", () => {
    expect(() =>
      validateQuantityAgainstAvailable(6, 5, INVENTORY_ID),
    ).toThrow(MaintenanceInvalidInventoryError);
  });

  it("accepts quantity equal to available inventory", () => {
    expect(() =>
      validateQuantityAgainstAvailable(5, 5, INVENTORY_ID),
    ).not.toThrow();
  });
});

describe("createMaintenanceNumber", () => {
  it("accepts valid maintenance number", () => {
    expect(createMaintenanceNumber("MNT-001")).toBe("MNT-001");
  });

  it("trims maintenance number", () => {
    expect(createMaintenanceNumber("  MNT-002  ")).toBe("MNT-002");
  });

  it("rejects empty maintenance number", () => {
    expect(() => createMaintenanceNumber("  ")).toThrow(
      MaintenanceInvariantError,
    );
  });
});
