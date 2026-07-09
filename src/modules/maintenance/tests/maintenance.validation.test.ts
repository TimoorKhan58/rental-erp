import { describe, expect, it } from "vitest";

import {
  CreateMaintenanceSchema,
  ListMaintenancesSchema,
  UpdateMaintenanceSchema,
} from "@/modules/maintenance/application/schemas/maintenance.schemas";

import {
  INVENTORY_ID,
  PRODUCT_ID,
  VALID_CREATE_INPUT,
  WAREHOUSE_ID,
} from "./helpers/maintenance.fixtures";

describe("CreateMaintenanceSchema", () => {
  it("accepts valid create input", () => {
    const result = CreateMaintenanceSchema.parse(VALID_CREATE_INPUT);

    expect(result.maintenanceNumber).toBe("MNT-2026-001");
    expect(result.quantity).toBe(2);
    expect(result.serviceType).toBe("PREVENTIVE");
  });

  it("rejects invalid inventory id", () => {
    expect(() =>
      CreateMaintenanceSchema.parse({
        ...VALID_CREATE_INPUT,
        inventoryId: "bad",
      }),
    ).toThrow();
  });

  it("rejects invalid product id", () => {
    expect(() =>
      CreateMaintenanceSchema.parse({
        ...VALID_CREATE_INPUT,
        productId: "bad",
      }),
    ).toThrow();
  });

  it("rejects invalid warehouse id", () => {
    expect(() =>
      CreateMaintenanceSchema.parse({
        ...VALID_CREATE_INPUT,
        warehouseId: "bad",
      }),
    ).toThrow();
  });

  it("rejects non-positive quantity", () => {
    expect(() =>
      CreateMaintenanceSchema.parse({
        ...VALID_CREATE_INPUT,
        quantity: 0,
      }),
    ).toThrow();
  });

  it("rejects negative estimated cost", () => {
    expect(() =>
      CreateMaintenanceSchema.parse({
        ...VALID_CREATE_INPUT,
        estimatedCost: -1,
      }),
    ).toThrow();
  });

  it("rejects negative actual cost", () => {
    expect(() =>
      CreateMaintenanceSchema.parse({
        ...VALID_CREATE_INPUT,
        actualCost: -1,
      }),
    ).toThrow();
  });

  it("rejects empty maintenance number", () => {
    expect(() =>
      CreateMaintenanceSchema.parse({
        ...VALID_CREATE_INPUT,
        maintenanceNumber: "",
      }),
    ).toThrow();
  });

  it("rejects invalid service type", () => {
    expect(() =>
      CreateMaintenanceSchema.parse({
        ...VALID_CREATE_INPUT,
        serviceType: "INVALID",
      }),
    ).toThrow();
  });

  it("accepts null optional fields", () => {
    const result = CreateMaintenanceSchema.parse({
      ...VALID_CREATE_INPUT,
      notes: null,
      technician: null,
      vendor: null,
    });

    expect(result.notes).toBeNull();
    expect(result.technician).toBeNull();
    expect(result.vendor).toBeNull();
  });

  it("accepts all valid service types", () => {
    for (const serviceType of [
      "PREVENTIVE",
      "CLEANING",
      "INSPECTION",
      "CALIBRATION",
      "LUBRICATION",
      "OTHER",
    ] as const) {
      const result = CreateMaintenanceSchema.parse({
        ...VALID_CREATE_INPUT,
        serviceType,
      });

      expect(result.serviceType).toBe(serviceType);
    }
  });
});

describe("UpdateMaintenanceSchema", () => {
  it("accepts estimated cost update", () => {
    const result = UpdateMaintenanceSchema.parse({ estimatedCost: 100 });

    expect(result.estimatedCost).toBe(100);
  });

  it("accepts quantity update", () => {
    const result = UpdateMaintenanceSchema.parse({ quantity: 2 });

    expect(result.quantity).toBe(2);
  });

  it("rejects empty update payload", () => {
    expect(() => UpdateMaintenanceSchema.parse({})).toThrow();
  });

  it("accepts notes update", () => {
    const result = UpdateMaintenanceSchema.parse({ notes: "Updated notes" });

    expect(result.notes).toBe("Updated notes");
  });

  it("accepts service type update", () => {
    const result = UpdateMaintenanceSchema.parse({ serviceType: "CLEANING" });

    expect(result.serviceType).toBe("CLEANING");
  });

  it("rejects negative estimated cost on update", () => {
    expect(() => UpdateMaintenanceSchema.parse({ estimatedCost: -5 })).toThrow();
  });

  it("rejects non-positive quantity on update", () => {
    expect(() => UpdateMaintenanceSchema.parse({ quantity: 0 })).toThrow();
  });
});

describe("ListMaintenancesSchema", () => {
  it("accepts valid list query", () => {
    const result = ListMaintenancesSchema.parse({
      page: "1",
      pageSize: "20",
      sortOrder: "desc",
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("accepts status filter", () => {
    const result = ListMaintenancesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      status: "SCHEDULED",
    });

    expect(result.status).toBe("SCHEDULED");
  });

  it("accepts product filter", () => {
    const result = ListMaintenancesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      productId: PRODUCT_ID,
    });

    expect(result.productId).toBe(PRODUCT_ID);
  });

  it("accepts warehouse filter", () => {
    const result = ListMaintenancesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      warehouseId: WAREHOUSE_ID,
    });

    expect(result.warehouseId).toBe(WAREHOUSE_ID);
  });

  it("accepts inventory filter", () => {
    const result = ListMaintenancesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      inventoryId: INVENTORY_ID,
    });

    expect(result.inventoryId).toBe(INVENTORY_ID);
  });

  it("accepts search filter", () => {
    const result = ListMaintenancesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      search: "MNT-2026",
    });

    expect(result.search).toBe("MNT-2026");
  });

  it("accepts sortBy field", () => {
    const result = ListMaintenancesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      sortBy: "maintenanceNumber",
    });

    expect(result.sortBy).toBe("maintenanceNumber");
  });

  it("rejects search term exceeding max length", () => {
    expect(() =>
      ListMaintenancesSchema.parse({
        page: "1",
        pageSize: "10",
        sortOrder: "desc",
        search: "x".repeat(201),
      }),
    ).toThrow();
  });
});
