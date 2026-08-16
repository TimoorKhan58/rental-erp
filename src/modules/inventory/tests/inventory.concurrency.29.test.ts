import { describe, expect, it } from "vitest";

import {
  INVENTORY_ID,
  PRODUCT_ID,
  WAREHOUSE_ID,
  buildInventoryEntity,
} from "./helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "./helpers/in-memory-inventory.repository";

/**
 * Phase 29 (F-03) inventory concurrency verification.
 *
 * These tests exercise the same primitives PrismaInventoryRepository uses:
 *  - decrementOnHand: atomic UPDATE predicated on `quantityOnHand >= qty`.
 *  - incrementOnHand: atomic UPDATE (isActive predicate).
 *  - applyAdjustment: atomic UPDATE predicated on the invariant
 *    `reservedQuantity <= quantityOnHand + delta`.
 *
 * The in-memory repository performs the predicate check and mutation
 * synchronously within one call — the same "check inside the mutation"
 * guarantee production PostgreSQL provides in a single SQL statement.
 */

function seed(quantityOnHand: number, reservedQuantity = 0) {
  const repository = new InMemoryInventoryRepository();
  repository.seed([
    buildInventoryEntity({
      id: INVENTORY_ID,
      productId: PRODUCT_ID,
      warehouseId: WAREHOUSE_ID,
      quantityOnHand,
      reservedQuantity,
    }),
  ]);
  return repository;
}

describe("Phase 29 F-03: inventory concurrency", () => {
  describe("T29.5 concurrent OUT", () => {
    it("only one OUT succeeds when only one fits (10 – 6 leaves 4)", async () => {
      const repository = seed(10);

      const results = await Promise.allSettled([
        repository.decrementOnHand(INVENTORY_ID, 6),
        repository.decrementOnHand(INVENTORY_ID, 6),
      ]);

      const successes = results.filter(
        (r) => r.status === "fulfilled" && r.value !== null,
      );
      const failures = results.filter(
        (r) => r.status === "fulfilled" && r.value === null,
      );
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);

      const stored = await repository.findById(INVENTORY_ID);
      expect(stored?.quantityOnHand).toBe(4);
      expect(stored?.quantityOnHand).toBeGreaterThanOrEqual(0);
    });

    it("both OUT succeed when both fit within stock (10 – 4 – 3 = 3)", async () => {
      const repository = seed(10);

      const results = await Promise.allSettled([
        repository.decrementOnHand(INVENTORY_ID, 4),
        repository.decrementOnHand(INVENTORY_ID, 3),
      ]);

      expect(
        results.every((r) => r.status === "fulfilled" && r.value !== null),
      ).toBe(true);

      const stored = await repository.findById(INVENTORY_ID);
      expect(stored?.quantityOnHand).toBe(3);
    });

    it("never lets quantityOnHand go negative under concurrent OUT", async () => {
      const repository = seed(5);

      const results = await Promise.allSettled([
        repository.decrementOnHand(INVENTORY_ID, 4),
        repository.decrementOnHand(INVENTORY_ID, 4),
        repository.decrementOnHand(INVENTORY_ID, 4),
      ]);

      const successes = results.filter(
        (r) => r.status === "fulfilled" && r.value !== null,
      );
      expect(successes).toHaveLength(1);

      const stored = await repository.findById(INVENTORY_ID);
      expect(stored?.quantityOnHand).toBe(1);
    });
  });

  describe("concurrent IN", () => {
    it("accumulates two concurrent IN operations without loss", async () => {
      const repository = seed(10);

      const results = await Promise.allSettled([
        repository.incrementOnHand(INVENTORY_ID, 5),
        repository.incrementOnHand(INVENTORY_ID, 3),
      ]);

      expect(
        results.every((r) => r.status === "fulfilled" && r.value !== null),
      ).toBe(true);

      const stored = await repository.findById(INVENTORY_ID);
      expect(stored?.quantityOnHand).toBe(18);
    });
  });

  describe("concurrent ADJUSTMENT", () => {
    it("rejects a negative adjustment that would leave quantity < reserved", async () => {
      const repository = seed(10, 8);

      const result = await repository.applyAdjustment(INVENTORY_ID, -3);
      expect(result).toBeNull();

      const stored = await repository.findById(INVENTORY_ID);
      expect(stored?.quantityOnHand).toBe(10);
    });

    it("accepts a positive adjustment atomically", async () => {
      const repository = seed(10, 8);

      const result = await repository.applyAdjustment(INVENTORY_ID, 5);
      expect(result?.quantityOnHand).toBe(15);
    });
  });
});
