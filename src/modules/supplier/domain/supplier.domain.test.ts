import { describe, expect, it } from "vitest";

import { Supplier } from "@/modules/supplier/domain/supplier.entity";
import {
  SupplierDomainError,
  SupplierInvariantError,
} from "@/modules/supplier/domain/supplier.errors";
import {
  createEmail,
  createPhoneNumber,
  createSupplierCode,
} from "@/modules/supplier/domain";

import { buildCreateSupplierData, SUPPLIER_ID } from "../tests/helpers/supplier.fixtures";

describe("Supplier entity", () => {
  it("creates normalized supplier props", () => {
    const props = Supplier.create(buildCreateSupplierData());

    expect(props.name).toBe("Fabric Wholesale Co");
    expect(props.address).toBe("456 Industrial Area, Karachi");
    expect(props.isActive).toBe(true);
  });

  it("trims required text fields", () => {
    const props = Supplier.create(
      buildCreateSupplierData({
        name: "  Trimmed Name  ",
        address: "  Trimmed Address  ",
      }),
    );

    expect(props.name).toBe("Trimmed Name");
    expect(props.address).toBe("Trimmed Address");
  });

  it("rejects empty name", () => {
    expect(() =>
      Supplier.create(buildCreateSupplierData({ name: "   " })),
    ).toThrow(SupplierInvariantError);
  });

  it("reconstitutes persisted supplier", () => {
    const created = Supplier.create(buildCreateSupplierData());
    const now = new Date();

    const supplier = Supplier.reconstitute({
      id: SUPPLIER_ID,
      ...created,
      createdAt: now,
      updatedAt: now,
    });

    expect(supplier.toProps().name).toBe("Fabric Wholesale Co");
  });
});

describe("Supplier value objects", () => {
  it("accepts valid supplier code", () => {
    expect(createSupplierCode("SUPP-001")).toBe("SUPP-001");
  });

  it("rejects empty supplier code", () => {
    expect(() => createSupplierCode("  ")).toThrow(SupplierInvariantError);
  });

  it("accepts valid phone number", () => {
    expect(createPhoneNumber("+923001234567")).toBe("+923001234567");
  });

  it("rejects invalid phone format", () => {
    expect(() => createPhoneNumber("abc")).toThrow(SupplierInvariantError);
  });

  it("accepts valid email", () => {
    expect(createEmail("contact@fabricwholesale.com")).toBe(
      "contact@fabricwholesale.com",
    );
  });

  it("returns null for empty email", () => {
    expect(createEmail(null)).toBeNull();
  });

  it("rejects invalid email format", () => {
    expect(() => createEmail("invalid")).toThrow(SupplierInvariantError);
  });
});

describe("Supplier domain errors", () => {
  it("creates domain error with name", () => {
    const error = new SupplierDomainError("test error");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("SupplierDomainError");
  });

  it("creates invariant error with field", () => {
    const error = new SupplierInvariantError("invalid", "phone");
    expect(error.field).toBe("phone");
  });
});
