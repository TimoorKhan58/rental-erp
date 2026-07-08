import { describe, expect, it } from "vitest";

import {
  CreateCustomerSchema,
  CustomerIdParamSchema,
  UpdateCustomerSchema,
} from "@/modules/customer/application/schemas/customer.schemas";
import { ListCustomersSchema } from "@/modules/customer/application/schemas/list-customers.schema";
import { parseRequest } from "@/shared/application/validation";

import { VALID_CREATE_INPUT } from "./helpers/customer.fixtures";

describe("Customer validation schemas", () => {
  it("accepts valid create payload", () => {
    const result = parseRequest(CreateCustomerSchema, VALID_CREATE_INPUT);
    expect(result.customerCode).toBe("CUST-001");
  });

  it("rejects invalid customer code", () => {
    expect(() =>
      parseRequest(CreateCustomerSchema, { ...VALID_CREATE_INPUT, customerCode: "" }),
    ).toThrow();
  });

  it("rejects invalid phone", () => {
    expect(() =>
      parseRequest(CreateCustomerSchema, { ...VALID_CREATE_INPUT, phone: "abc" }),
    ).toThrow();
  });

  it("rejects invalid CNIC", () => {
    expect(() =>
      parseRequest(CreateCustomerSchema, { ...VALID_CREATE_INPUT, cnic: "123" }),
    ).toThrow();
  });

  it("accepts valid customer id param", () => {
    const result = parseRequest(CustomerIdParamSchema, {
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.id).toBeTruthy();
  });

  it("rejects invalid customer id param", () => {
    expect(() => parseRequest(CustomerIdParamSchema, { id: "bad-id" })).toThrow();
  });

  it("accepts valid update payload", () => {
    const result = parseRequest(UpdateCustomerSchema, { name: "Updated" });
    expect(result.name).toBe("Updated");
  });

  it("rejects empty update payload", () => {
    expect(() => parseRequest(UpdateCustomerSchema, {})).toThrow();
  });

  it("accepts valid pagination input", () => {
    const result = parseRequest(ListCustomersSchema, {
      page: "1",
      pageSize: "20",
      search: "Manyar",
    });
    expect(result.page).toBe(1);
    expect(result.search).toBe("Manyar");
  });

  it("rejects invalid pagination page", () => {
    expect(() => parseRequest(ListCustomersSchema, { page: 0, pageSize: 20 })).toThrow();
  });

  it("rejects overly long search term", () => {
    expect(() =>
      parseRequest(ListCustomersSchema, {
        page: 1,
        pageSize: 20,
        search: "x".repeat(201),
      }),
    ).toThrow();
  });
});
