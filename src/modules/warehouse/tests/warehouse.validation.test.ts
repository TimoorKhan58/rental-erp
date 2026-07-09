import { describe, expect, it } from "vitest";

import {
  CreateWarehouseSchema,
  WarehouseIdParamSchema,
  UpdateWarehouseSchema,
} from "@/modules/warehouse/application/schemas/warehouse.schemas";
import { ListWarehousesSchema } from "@/modules/warehouse/application/schemas/list-warehouses.schema";
import { parseRequest } from "@/shared/application/validation";

import { VALID_CREATE_INPUT } from "./helpers/warehouse.fixtures";

describe("Warehouse validation schemas", () => {
  it("accepts valid create payload", () => {
    const result = parseRequest(CreateWarehouseSchema, VALID_CREATE_INPUT);
    expect(result.warehouseCode).toBe("WH-001");
  });

  it("accepts create payload without optional phone", () => {
    const inputWithoutPhone = {
      warehouseCode: VALID_CREATE_INPUT.warehouseCode,
      name: VALID_CREATE_INPUT.name,
      description: VALID_CREATE_INPUT.description,
      address: VALID_CREATE_INPUT.address,
      contactPerson: VALID_CREATE_INPUT.contactPerson,
      isActive: VALID_CREATE_INPUT.isActive,
    };
    const result = parseRequest(CreateWarehouseSchema, inputWithoutPhone);
    expect(result.phone).toBeUndefined();
  });

  it("rejects invalid warehouse code", () => {
    expect(() =>
      parseRequest(CreateWarehouseSchema, {
        ...VALID_CREATE_INPUT,
        warehouseCode: "",
      }),
    ).toThrow();
  });

  it("rejects invalid phone when provided", () => {
    expect(() =>
      parseRequest(CreateWarehouseSchema, { ...VALID_CREATE_INPUT, phone: "abc" }),
    ).toThrow();
  });

  it("accepts valid warehouse id param", () => {
    const result = parseRequest(WarehouseIdParamSchema, {
      id: "660e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.id).toBeTruthy();
  });

  it("rejects invalid warehouse id param", () => {
    expect(() => parseRequest(WarehouseIdParamSchema, { id: "bad-id" })).toThrow();
  });

  it("accepts valid update payload", () => {
    const result = parseRequest(UpdateWarehouseSchema, { name: "Updated" });
    expect(result.name).toBe("Updated");
  });

  it("rejects empty update payload", () => {
    expect(() => parseRequest(UpdateWarehouseSchema, {})).toThrow();
  });

  it("accepts valid pagination input", () => {
    const result = parseRequest(ListWarehousesSchema, {
      page: "1",
      pageSize: "20",
      search: "Main",
    });
    expect(result.page).toBe(1);
    expect(result.search).toBe("Main");
  });

  it("rejects invalid pagination page", () => {
    expect(() =>
      parseRequest(ListWarehousesSchema, { page: 0, pageSize: 20 }),
    ).toThrow();
  });

  it("rejects overly long search term", () => {
    expect(() =>
      parseRequest(ListWarehousesSchema, {
        page: 1,
        pageSize: 20,
        search: "x".repeat(201),
      }),
    ).toThrow();
  });
});
