import { describe, expect, it } from "vitest";

import { Inventory } from "@/modules/inventory/domain/inventory.entity";
import {
  InventoryDomainError,
  InventoryInvariantError,
} from "@/modules/inventory/domain/inventory.errors";

import {
  buildCreateInventoryData,
  INVENTORY_ID,
  OTHER_PRODUCT_ID,
  OTHER_WAREHOUSE_ID,
  PRODUCT_ID,
  WAREHOUSE_ID,
} from "../tests/helpers/inventory.fixtures";

describe("Inventory entity", () => {
  it("creates normalized inventory props with defaults", () => {
    const props = Inventory.create(
      buildCreateInventoryData({
        reservedQuantity: undefined,
        minimumStock: undefined,
        maximumStock: undefined,
      }),
    );

    expect(props.quantityOnHand).toBe(100);
    expect(props.reservedQuantity).toBe(0);
    expect(props.minimumStock).toBe(0);
    expect(props.maximumStock).toBeNull();
    expect(props.isActive).toBe(true);
  });

  it("creates inventory with explicit quantities", () => {
    const props = Inventory.create(buildCreateInventoryData());

    expect(props.quantityOnHand).toBe(100);
    expect(props.reservedQuantity).toBe(10);
    expect(props.minimumStock).toBe(5);
    expect(props.maximumStock).toBe(500);
  });

  it("reconstitutes persisted inventory", () => {
    const created = Inventory.create(buildCreateInventoryData());
    const now = new Date();

    const inventory = Inventory.reconstitute({
      id: INVENTORY_ID,
      ...created,
      createdAt: now,
      updatedAt: now,
    });

    expect(inventory.toProps().quantityOnHand).toBe(100);
  });
});

describe("Inventory availableQuantity", () => {
  it("derives availableQuantity from on-hand minus reserved", () => {
    const inventory = Inventory.reconstitute({
      id: INVENTORY_ID,
      productId: PRODUCT_ID,
      warehouseId: WAREHOUSE_ID,
      quantityOnHand: 100,
      reservedQuantity: 10,
      minimumStock: 5,
      maximumStock: 500,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(inventory.availableQuantity).toBe(90);
  });

  it("returns full on-hand when nothing is reserved", () => {
    const inventory = Inventory.reconstitute({
      id: INVENTORY_ID,
      productId: PRODUCT_ID,
      warehouseId: WAREHOUSE_ID,
      quantityOnHand: 50,
      reservedQuantity: 0,
      minimumStock: 0,
      maximumStock: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(inventory.availableQuantity).toBe(50);
  });

  it("includes availableQuantity in toProps", () => {
    const inventory = Inventory.reconstitute({
      id: INVENTORY_ID,
      productId: PRODUCT_ID,
      warehouseId: WAREHOUSE_ID,
      quantityOnHand: 80,
      reservedQuantity: 25,
      minimumStock: 0,
      maximumStock: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(inventory.toProps().availableQuantity).toBe(55);
  });

  it("allows zero available when fully reserved", () => {
    const inventory = Inventory.reconstitute({
      id: INVENTORY_ID,
      productId: PRODUCT_ID,
      warehouseId: WAREHOUSE_ID,
      quantityOnHand: 10,
      reservedQuantity: 10,
      minimumStock: 0,
      maximumStock: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(inventory.availableQuantity).toBe(0);
  });
});

describe("Inventory quantity invariants", () => {
  it("rejects negative quantityOnHand", () => {
    expect(() =>
      Inventory.create(buildCreateInventoryData({ quantityOnHand: -1 })),
    ).toThrow(InventoryInvariantError);
  });

  it("rejects negative reservedQuantity", () => {
    expect(() =>
      Inventory.create(buildCreateInventoryData({ reservedQuantity: -1 })),
    ).toThrow(InventoryInvariantError);
  });

  it("rejects reservedQuantity exceeding quantityOnHand", () => {
    expect(() =>
      Inventory.create(
        buildCreateInventoryData({
          quantityOnHand: 10,
          reservedQuantity: 11,
        }),
      ),
    ).toThrow(InventoryInvariantError);
  });

  it("rejects negative minimumStock", () => {
    expect(() =>
      Inventory.create(buildCreateInventoryData({ minimumStock: -1 })),
    ).toThrow(InventoryInvariantError);
  });

  it("rejects maximumStock below minimumStock", () => {
    expect(() =>
      Inventory.create(
        buildCreateInventoryData({
          minimumStock: 20,
          maximumStock: 10,
        }),
      ),
    ).toThrow(InventoryInvariantError);
  });

  it("allows null maximumStock", () => {
    const props = Inventory.create(
      buildCreateInventoryData({ maximumStock: null }),
    );

    expect(props.maximumStock).toBeNull();
  });

  it("allows maximumStock equal to minimumStock", () => {
    const props = Inventory.create(
      buildCreateInventoryData({
        minimumStock: 10,
        maximumStock: 10,
      }),
    );

    expect(props.maximumStock).toBe(10);
  });

  it("rejects invalid quantities on reconstitute", () => {
    expect(() =>
      Inventory.reconstitute({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 5,
        reservedQuantity: 6,
        minimumStock: 0,
        maximumStock: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).toThrow(InventoryInvariantError);
  });
});

describe("Inventory domain errors", () => {
  it("creates domain error with name", () => {
    const error = new InventoryDomainError("test error");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("InventoryDomainError");
  });

  it("creates invariant error with field", () => {
    const error = new InventoryInvariantError("invalid", "quantityOnHand");
    expect(error.field).toBe("quantityOnHand");
  });

  it("preserves product and warehouse ids on entity", () => {
    const inventory = Inventory.reconstitute({
      id: INVENTORY_ID,
      productId: OTHER_PRODUCT_ID,
      warehouseId: OTHER_WAREHOUSE_ID,
      quantityOnHand: 1,
      reservedQuantity: 0,
      minimumStock: 0,
      maximumStock: null,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(inventory.productId).toBe(OTHER_PRODUCT_ID);
    expect(inventory.warehouseId).toBe(OTHER_WAREHOUSE_ID);
    expect(inventory.isActive).toBe(false);
  });
});
