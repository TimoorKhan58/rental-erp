import { describe, expect, it } from "vitest";

import { Customer } from "@/modules/customer/domain/customer.entity";
import {
  CustomerDomainError,
  CustomerInvariantError,
} from "@/modules/customer/domain/customer.errors";
import {
  createCnic,
  createCustomerCode,
  createPhoneNumber,
} from "@/modules/customer/domain";

import { buildCreateCustomerData, CUSTOMER_ID } from "../tests/helpers/customer.fixtures";

describe("Customer entity", () => {
  it("creates normalized customer props", () => {
    const props = Customer.create(buildCreateCustomerData());

    expect(props.name).toBe("Manyar Tent Service");
    expect(props.address).toBe("123 Main Street, Lahore");
    expect(props.isActive).toBe(true);
  });

  it("trims required text fields", () => {
    const props = Customer.create(
      buildCreateCustomerData({
        name: "  Trimmed Name  ",
        address: "  Trimmed Address  ",
      }),
    );

    expect(props.name).toBe("Trimmed Name");
    expect(props.address).toBe("Trimmed Address");
  });

  it("rejects empty name", () => {
    expect(() =>
      Customer.create(buildCreateCustomerData({ name: "   " })),
    ).toThrow(CustomerInvariantError);
  });

  it("reconstitutes persisted customer", () => {
    const created = Customer.create(buildCreateCustomerData());
    const now = new Date();

    const customer = Customer.reconstitute({
      id: CUSTOMER_ID,
      ...created,
      createdAt: now,
      updatedAt: now,
    });

    expect(customer.toProps().name).toBe("Manyar Tent Service");
  });
});

describe("Customer value objects", () => {
  it("accepts valid customer code", () => {
    expect(createCustomerCode("CUST-001")).toBe("CUST-001");
  });

  it("rejects empty customer code", () => {
    expect(() => createCustomerCode("  ")).toThrow(CustomerInvariantError);
  });

  it("accepts valid phone number", () => {
    expect(createPhoneNumber("+923001234567")).toBe("+923001234567");
  });

  it("rejects invalid phone format", () => {
    expect(() => createPhoneNumber("abc")).toThrow(CustomerInvariantError);
  });

  it("accepts valid CNIC", () => {
    expect(createCnic("12345-1234567-1")).toBe("12345-1234567-1");
  });

  it("returns null for empty CNIC", () => {
    expect(createCnic(null)).toBeNull();
  });

  it("rejects invalid CNIC format", () => {
    expect(() => createCnic("invalid")).toThrow(CustomerInvariantError);
  });
});

describe("Customer domain errors", () => {
  it("creates domain error with name", () => {
    const error = new CustomerDomainError("test error");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("CustomerDomainError");
  });

  it("creates invariant error with field", () => {
    const error = new CustomerInvariantError("invalid", "phone");
    expect(error.field).toBe("phone");
  });
});
