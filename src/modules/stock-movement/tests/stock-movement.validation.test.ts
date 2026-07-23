import { describe, expect, it } from "vitest";

import {
  CreateStockMovementSchema,
  ListStockMovementsSchema,
  StockMovementIdParamSchema,
} from "@/modules/stock-movement/application";

import {
  INVENTORY_ID,
  STOCK_MOVEMENT_ID,
  VALID_CREATE_INPUT,
} from "../tests/helpers/stock-movement.fixtures";

describe("StockMovementIdParamSchema", () => {
  it("accepts valid UUID", () => {
    const result = StockMovementIdParamSchema.safeParse({
      id: STOCK_MOVEMENT_ID,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID", () => {
    const result = StockMovementIdParamSchema.safeParse({ id: "not-a-uuid" });

    expect(result.success).toBe(false);
  });
});

describe("CreateStockMovementSchema", () => {
  it("accepts valid create input", () => {
    const result = CreateStockMovementSchema.safeParse(VALID_CREATE_INPUT);

    expect(result.success).toBe(true);
  });

  it("accepts minimal required fields", () => {
    const result = CreateStockMovementSchema.safeParse({
      inventoryId: INVENTORY_ID,
      movementType: "IN",
      quantity: 1,
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing inventoryId", () => {
    const result = CreateStockMovementSchema.safeParse({
      movementType: "IN",
      quantity: 1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing movementType", () => {
    const result = CreateStockMovementSchema.safeParse({
      inventoryId: INVENTORY_ID,
      quantity: 1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid movementType", () => {
    const result = CreateStockMovementSchema.safeParse({
      inventoryId: INVENTORY_ID,
      movementType: "TRANSFER",
      quantity: 1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects zero quantity", () => {
    const result = CreateStockMovementSchema.safeParse({
      inventoryId: INVENTORY_ID,
      movementType: "IN",
      quantity: 0,
    });

    expect(result.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const result = CreateStockMovementSchema.safeParse({
      inventoryId: INVENTORY_ID,
      movementType: "IN",
      quantity: -5,
    });

    expect(result.success).toBe(false);
  });

  it("accepts negative quantity for ADJUSTMENT", () => {
    const result = CreateStockMovementSchema.safeParse({
      inventoryId: INVENTORY_ID,
      movementType: "ADJUSTMENT",
      quantity: -5,
    });

    expect(result.success).toBe(true);
  });

  it("rejects zero quantity for ADJUSTMENT", () => {
    const result = CreateStockMovementSchema.safeParse({
      inventoryId: INVENTORY_ID,
      movementType: "ADJUSTMENT",
      quantity: 0,
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid inventoryId", () => {
    const result = CreateStockMovementSchema.safeParse({
      inventoryId: "bad",
      movementType: "IN",
      quantity: 1,
    });

    expect(result.success).toBe(false);
  });

  it("accepts all movement types", () => {
    for (const movementType of [
      "IN",
      "OUT",
      "RESERVE",
      "RELEASE",
      "ADJUSTMENT",
    ]) {
      const result = CreateStockMovementSchema.safeParse({
        inventoryId: INVENTORY_ID,
        movementType,
        quantity: 1,
      });

      expect(result.success).toBe(true);
    }
  });

  it("rejects remarks longer than 500 characters", () => {
    const result = CreateStockMovementSchema.safeParse({
      inventoryId: INVENTORY_ID,
      movementType: "IN",
      quantity: 1,
      remarks: "x".repeat(501),
    });

    expect(result.success).toBe(false);
  });
});

describe("ListStockMovementsSchema", () => {
  it("accepts pagination defaults", () => {
    const result = ListStockMovementsSchema.safeParse({
      page: 1,
      pageSize: 20,
      sortOrder: "asc",
    });

    expect(result.success).toBe(true);
  });

  it("accepts optional filters", () => {
    const result = ListStockMovementsSchema.safeParse({
      page: 1,
      pageSize: 20,
      sortOrder: "desc",
      inventoryId: INVENTORY_ID,
      movementType: "IN",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid movementType filter", () => {
    const result = ListStockMovementsSchema.safeParse({
      page: 1,
      pageSize: 20,
      sortOrder: "asc",
      movementType: "INVALID",
    });

    expect(result.success).toBe(false);
  });

  it("rejects search longer than 200 characters", () => {
    const result = ListStockMovementsSchema.safeParse({
      page: 1,
      pageSize: 20,
      sortOrder: "asc",
      search: "x".repeat(201),
    });

    expect(result.success).toBe(false);
  });
});
