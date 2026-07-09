import { describe, expect, it } from "vitest";

import {
  CreateSupplierSchema,
  SupplierIdParamSchema,
  UpdateSupplierSchema,
} from "@/modules/supplier/application/schemas/supplier.schemas";
import { ListSuppliersSchema } from "@/modules/supplier/application/schemas/list-suppliers.schema";
import { parseRequest } from "@/shared/application/validation";

import { VALID_CREATE_INPUT } from "./helpers/supplier.fixtures";

describe("Supplier validation schemas", () => {
  it("accepts valid create payload", () => {
    const result = parseRequest(CreateSupplierSchema, VALID_CREATE_INPUT);
    expect(result.supplierCode).toBe("SUPP-001");
  });

  it("rejects invalid supplier code", () => {
    expect(() =>
      parseRequest(CreateSupplierSchema, { ...VALID_CREATE_INPUT, supplierCode: "" }),
    ).toThrow();
  });

  it("rejects invalid phone", () => {
    expect(() =>
      parseRequest(CreateSupplierSchema, { ...VALID_CREATE_INPUT, phone: "abc" }),
    ).toThrow();
  });

  it("rejects invalid email", () => {
    expect(() =>
      parseRequest(CreateSupplierSchema, { ...VALID_CREATE_INPUT, email: "bad" }),
    ).toThrow();
  });

  it("accepts valid supplier id param", () => {
    const result = parseRequest(SupplierIdParamSchema, {
      id: "660e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.id).toBeTruthy();
  });

  it("rejects invalid supplier id param", () => {
    expect(() => parseRequest(SupplierIdParamSchema, { id: "bad-id" })).toThrow();
  });

  it("accepts valid update payload", () => {
    const result = parseRequest(UpdateSupplierSchema, { name: "Updated" });
    expect(result.name).toBe("Updated");
  });

  it("rejects empty update payload", () => {
    expect(() => parseRequest(UpdateSupplierSchema, {})).toThrow();
  });

  it("accepts valid pagination input", () => {
    const result = parseRequest(ListSuppliersSchema, {
      page: "1",
      pageSize: "20",
      search: "Fabric",
    });
    expect(result.page).toBe(1);
    expect(result.search).toBe("Fabric");
  });

  it("rejects invalid pagination page", () => {
    expect(() => parseRequest(ListSuppliersSchema, { page: 0, pageSize: 20 })).toThrow();
  });

  it("rejects overly long search term", () => {
    expect(() =>
      parseRequest(ListSuppliersSchema, {
        page: 1,
        pageSize: 20,
        search: "x".repeat(201),
      }),
    ).toThrow();
  });
});
