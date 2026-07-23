import { describe, expect, it } from "vitest";

import { Inventory } from "@/modules/inventory/domain/inventory.entity";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { StockMovement } from "@/modules/stock-movement/domain/stock-movement.entity";
import {
  StockMovementDomainError,
  StockMovementInvariantError,
  StockMovementInsufficientQuantityError,
} from "@/modules/stock-movement/domain/stock-movement.errors";
import { computeMovementEffect } from "@/modules/stock-movement/application/services/movement-effect";

import {
  buildCreateStockMovementData,
  buildStockMovementEntity,
  INVENTORY_ID,
  PRODUCT_ID,
  STOCK_MOVEMENT_ID,
  USER_ID,
  WAREHOUSE_ID,
} from "../tests/helpers/stock-movement.fixtures";

describe("StockMovement entity", () => {
  it("creates normalized stock movement props", () => {
    const props = StockMovement.create(buildCreateStockMovementData());

    expect(props.movementType).toBe("IN");
    expect(props.quantity).toBe(10);
    expect(props.previousQuantity).toBe(100);
    expect(props.newQuantity).toBe(110);
    expect(props.remarks).toBe("Initial stock receipt");
  });

  it("defaults optional reference fields to null and remarks to empty string", () => {
    const props = StockMovement.create(
      buildCreateStockMovementData({
        referenceType: undefined,
        referenceId: undefined,
        remarks: undefined,
      }),
    );

    expect(props.referenceType).toBeNull();
    expect(props.referenceId).toBeNull();
    expect(props.remarks).toBe("");
  });

  it("reconstitutes persisted stock movement", () => {
    const movement = buildStockMovementEntity();

    expect(movement.toProps().id).toBe(STOCK_MOVEMENT_ID);
    expect(movement.toProps().inventoryId).toBe(INVENTORY_ID);
  });

  it("rejects zero quantity", () => {
    expect(() =>
      StockMovement.create(buildCreateStockMovementData({ quantity: 0 })),
    ).toThrow(StockMovementInvariantError);
  });

  it("rejects negative quantity", () => {
    expect(() =>
      StockMovement.create(buildCreateStockMovementData({ quantity: -5 })),
    ).toThrow(StockMovementInvariantError);
  });

  it("rejects negative previousQuantity", () => {
    expect(() =>
      StockMovement.create(
        buildCreateStockMovementData({ previousQuantity: -1 }),
      ),
    ).toThrow(StockMovementInvariantError);
  });

  it("rejects negative newQuantity", () => {
    expect(() =>
      StockMovement.create(buildCreateStockMovementData({ newQuantity: -1 })),
    ).toThrow(StockMovementInvariantError);
  });

  it("preserves all movement types", () => {
    for (const movementType of [
      "IN",
      "OUT",
      "RESERVE",
      "RELEASE",
      "ADJUSTMENT",
    ] as const) {
      const props = StockMovement.create(
        buildCreateStockMovementData({ movementType }),
      );
      expect(props.movementType).toBe(movementType);
    }
  });

  it("toProps returns immutable snapshot", () => {
    const movement = buildStockMovementEntity();
    const props = movement.toProps();

    expect(props.productId).toBe(PRODUCT_ID);
    expect(props.warehouseId).toBe(WAREHOUSE_ID);
    expect(props.createdById).toBe(USER_ID);
  });
});

describe("StockMovement errors", () => {
  it("StockMovementDomainError has correct name", () => {
    const error = new StockMovementDomainError("test");
    expect(error.name).toBe("StockMovementDomainError");
  });

  it("StockMovementInvariantError includes field", () => {
    const error = new StockMovementInvariantError("invalid", "quantity");
    expect(error.field).toBe("quantity");
  });

  it("StockMovementInsufficientQuantityError includes quantities", () => {
    const error = new StockMovementInsufficientQuantityError(
      "insufficient",
      "OUT",
      50,
      10,
    );

    expect(error.movementType).toBe("OUT");
    expect(error.requestedQuantity).toBe(50);
    expect(error.availableQuantity).toBe(10);
  });
});

describe("computeMovementEffect", () => {
  const inventory = buildInventoryEntity({
    quantityOnHand: 100,
    reservedQuantity: 10,
  });

  it("IN increases quantityOnHand and tracks on-hand ledger", () => {
    const effect = computeMovementEffect(inventory, "IN", 25);

    expect(effect.quantityOnHand).toBe(125);
    expect(effect.reservedQuantity).toBe(10);
    expect(effect.previousQuantity).toBe(100);
    expect(effect.newQuantity).toBe(125);
  });

  it("OUT decreases quantityOnHand and tracks on-hand ledger", () => {
    const effect = computeMovementEffect(inventory, "OUT", 30);

    expect(effect.quantityOnHand).toBe(70);
    expect(effect.reservedQuantity).toBe(10);
    expect(effect.previousQuantity).toBe(100);
    expect(effect.newQuantity).toBe(70);
  });

  it("OUT rejects when quantityOnHand is insufficient", () => {
    expect(() => computeMovementEffect(inventory, "OUT", 101)).toThrow(
      StockMovementInsufficientQuantityError,
    );
  });

  it("RESERVE increases reservedQuantity and tracks reserved ledger", () => {
    const effect = computeMovementEffect(inventory, "RESERVE", 20);

    expect(effect.quantityOnHand).toBe(100);
    expect(effect.reservedQuantity).toBe(30);
    expect(effect.previousQuantity).toBe(10);
    expect(effect.newQuantity).toBe(30);
  });

  it("RESERVE rejects when available quantity is insufficient", () => {
    expect(() => computeMovementEffect(inventory, "RESERVE", 91)).toThrow(
      StockMovementInsufficientQuantityError,
    );
  });

  it("RELEASE decreases reservedQuantity and tracks reserved ledger", () => {
    const effect = computeMovementEffect(inventory, "RELEASE", 5);

    expect(effect.quantityOnHand).toBe(100);
    expect(effect.reservedQuantity).toBe(5);
    expect(effect.previousQuantity).toBe(10);
    expect(effect.newQuantity).toBe(5);
  });

  it("RELEASE rejects when reserved quantity is insufficient", () => {
    expect(() => computeMovementEffect(inventory, "RELEASE", 11)).toThrow(
      StockMovementInsufficientQuantityError,
    );
  });

  it("ADJUSTMENT increases quantityOnHand and tracks on-hand ledger", () => {
    const effect = computeMovementEffect(inventory, "ADJUSTMENT", 15);

    expect(effect.quantityOnHand).toBe(115);
    expect(effect.reservedQuantity).toBe(10);
    expect(effect.previousQuantity).toBe(100);
    expect(effect.newQuantity).toBe(115);
  });

  it("ADJUSTMENT decreases quantityOnHand with negative quantity", () => {
    const effect = computeMovementEffect(inventory, "ADJUSTMENT", -15);

    expect(effect.quantityOnHand).toBe(85);
    expect(effect.reservedQuantity).toBe(10);
    expect(effect.previousQuantity).toBe(100);
    expect(effect.newQuantity).toBe(85);
  });

  it("ADJUSTMENT rejects decrease that would go below reserved quantity", () => {
    expect(() => computeMovementEffect(inventory, "ADJUSTMENT", -95)).toThrow(
      StockMovementInsufficientQuantityError,
    );
  });

  it("reconstituted inventory remains valid after IN movement", () => {
    const effect = computeMovementEffect(inventory, "IN", 10);
    const props = inventory.toProps();

    expect(() =>
      Inventory.reconstitute({
        ...props,
        quantityOnHand: effect.quantityOnHand,
        reservedQuantity: effect.reservedQuantity,
        updatedAt: new Date(),
      }),
    ).not.toThrow();
  });

  it("reconstituted inventory remains valid after RESERVE movement", () => {
    const effect = computeMovementEffect(inventory, "RESERVE", 20);
    const props = inventory.toProps();

    expect(() =>
      Inventory.reconstitute({
        ...props,
        quantityOnHand: effect.quantityOnHand,
        reservedQuantity: effect.reservedQuantity,
        updatedAt: new Date(),
      }),
    ).not.toThrow();
  });
});
