import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import {
  INVENTORY_ID,
  buildInventoryEntity,
} from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { MockAuditLogger } from "@/modules/dispatch/tests/helpers/mock-audit-logger";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";

import { executeCreateStockMovementInScope } from "./services/create-stock-movement-in-scope";
import {
  releaseReferenceReservationInScope,
  sumReservedForProduct,
} from "./services/release-reference-reservation-in-scope";
import type { StockMovementWriteScope } from "./services/stock-movement-transaction.runner";

const ORDER_A = "aa0e8400-e29b-41d4-a716-446655440001";
const ORDER_B = "aa0e8400-e29b-41d4-a716-446655440002";
const REF = "RENTAL_ORDER";

describe("releaseReferenceReservationInScope (QA-012)", () => {
  let inventoryRepository: InMemoryInventoryRepository;
  let stockMovementRepository: InMemoryStockMovementRepository;
  let scope: StockMovementWriteScope;

  const reserved = async () =>
    (await inventoryRepository.findById(INVENTORY_ID))?.reservedQuantity;

  const reserve = (referenceId: string, quantity: number) =>
    executeCreateStockMovementInScope(scope, {
      inventoryId: INVENTORY_ID,
      movementType: "RESERVE",
      quantity,
      referenceType: REF,
      referenceId,
      remarks: "test reserve",
    });

  beforeEach(() => {
    inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({ quantityOnHand: 200, reservedQuantity: 0 }),
    ]);
    stockMovementRepository = new InMemoryStockMovementRepository();
    scope = {
      inventoryRepository,
      stockMovementRepository,
      auditLogger: new MockAuditLogger(),
      userId: "550e8400-e29b-41d4-a716-446655440099",
    };
  });

  it("does not consume another order's hold when this order reserved nothing", async () => {
    await reserve(ORDER_B, 10);

    const released = await releaseReferenceReservationInScope(scope, {
      inventoryId: INVENTORY_ID,
      referenceType: REF,
      referenceId: ORDER_A,
      reservedByReference: 0,
      maxQuantity: 6,
      remarks: "dispatch of unreserved order A",
    });

    expect(released).toBe(0);
    expect(await reserved()).toBe(10);
  });

  it("does not release twice: dispatch consumes the hold, return then releases nothing", async () => {
    await reserve(ORDER_A, 6);
    await reserve(ORDER_B, 10);

    const atDispatch = await releaseReferenceReservationInScope(scope, {
      inventoryId: INVENTORY_ID,
      referenceType: REF,
      referenceId: ORDER_A,
      reservedByReference: 6,
      maxQuantity: 6,
      remarks: "dispatch A",
    });
    const atReturn = await releaseReferenceReservationInScope(scope, {
      inventoryId: INVENTORY_ID,
      referenceType: REF,
      referenceId: ORDER_A,
      reservedByReference: 6,
      maxQuantity: 6,
      remarks: "return A",
    });

    expect(atDispatch).toBe(6);
    expect(atReturn).toBe(0);
    expect(await reserved()).toBe(10);
  });

  it("releases the undispatched remainder when the order completes", async () => {
    await reserve(ORDER_A, 38);
    await reserve(ORDER_B, 5);

    await releaseReferenceReservationInScope(scope, {
      inventoryId: INVENTORY_ID,
      referenceType: REF,
      referenceId: ORDER_A,
      reservedByReference: 38,
      maxQuantity: 29,
      remarks: "dispatch 29 of 38",
    });
    const atCompletion = await releaseReferenceReservationInScope(scope, {
      inventoryId: INVENTORY_ID,
      referenceType: REF,
      referenceId: ORDER_A,
      reservedByReference: 38,
      remarks: "order completed",
    });

    expect(atCompletion).toBe(9);
    expect(await reserved()).toBe(5);
  });

  it("never releases more than the inventory currently holds", async () => {
    inventoryRepository.seed([
      buildInventoryEntity({ quantityOnHand: 200, reservedQuantity: 3 }),
    ]);

    const released = await releaseReferenceReservationInScope(scope, {
      inventoryId: INVENTORY_ID,
      referenceType: REF,
      referenceId: ORDER_A,
      reservedByReference: 10,
      remarks: "legacy order with partial inventory hold",
    });

    expect(released).toBe(3);
    expect(await reserved()).toBe(0);
  });
});

describe("sumReservedForProduct", () => {
  it("sums reserved quantity across lines of the same product only", () => {
    expect(
      sumReservedForProduct(
        [
          { productId: "p1", reservedQuantity: 4 },
          { productId: "p2", reservedQuantity: 7 },
          { productId: "p1", reservedQuantity: 2 },
        ],
        "p1",
      ),
    ).toBe(6);
  });
});
