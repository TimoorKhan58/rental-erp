import { describe, expect, it } from "vitest";

import { Warehouse } from "@/modules/warehouse/domain/warehouse.entity";
import {
  WarehouseDomainError,
  WarehouseInvariantError,
} from "@/modules/warehouse/domain/warehouse.errors";
import {
  createPhoneNumber,
  createWarehouseCode,
} from "@/modules/warehouse/domain";

import {
  buildCreateWarehouseData,
  WAREHOUSE_ID,
} from "../tests/helpers/warehouse.fixtures";

describe("Warehouse entity", () => {
  it("creates normalized warehouse props", () => {
    const props = Warehouse.create(buildCreateWarehouseData());

    expect(props.name).toBe("Main Storage Hub");
    expect(props.description).toBe("Primary warehouse for inventory");
    expect(props.isActive).toBe(true);
  });

  it("trims required text fields", () => {
    const props = Warehouse.create(
      buildCreateWarehouseData({
        name: "  Trimmed Name  ",
      }),
    );

    expect(props.name).toBe("Trimmed Name");
  });

  it("rejects empty name", () => {
    expect(() =>
      Warehouse.create(buildCreateWarehouseData({ name: "   " })),
    ).toThrow(WarehouseInvariantError);
  });

  it("reconstitutes persisted warehouse", () => {
    const created = Warehouse.create(buildCreateWarehouseData());
    const now = new Date();

    const warehouse = Warehouse.reconstitute({
      id: WAREHOUSE_ID,
      ...created,
      createdAt: now,
      updatedAt: now,
    });

    expect(warehouse.toProps().name).toBe("Main Storage Hub");
  });
});

describe("Warehouse value objects", () => {
  it("accepts valid warehouse code", () => {
    expect(createWarehouseCode("WH-001")).toBe("WH-001");
  });

  it("rejects empty warehouse code", () => {
    expect(() => createWarehouseCode("  ")).toThrow(WarehouseInvariantError);
  });

  it("accepts valid phone number", () => {
    expect(createPhoneNumber("+923001234567")).toBe("+923001234567");
  });

  it("rejects invalid phone format", () => {
    expect(() => createPhoneNumber("abc")).toThrow(WarehouseInvariantError);
  });

  it("returns null for empty phone", () => {
    expect(createPhoneNumber(null)).toBeNull();
    expect(createPhoneNumber("")).toBeNull();
  });

  it("returns null for whitespace-only phone", () => {
    expect(createPhoneNumber("   ")).toBeNull();
  });
});

describe("Warehouse domain errors", () => {
  it("creates domain error with name", () => {
    const error = new WarehouseDomainError("test error");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("WarehouseDomainError");
  });

  it("creates invariant error with field", () => {
    const error = new WarehouseInvariantError("invalid", "phone");
    expect(error.field).toBe("phone");
  });
});
