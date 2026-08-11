import { describe, expect, it } from "vitest";

import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import {
  INVENTORY_ID,
  buildInventoryEntity,
} from "@/modules/inventory/tests/helpers/inventory.fixtures";

describe("InMemoryInventoryRepository.reserveAvailableQuantity", () => {
  it("reserves when capacity allows", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 0 }),
    ]);

    const updated = await repository.reserveAvailableQuantity(INVENTORY_ID, 40);

    expect(updated?.reservedQuantity).toBe(40);
    expect((await repository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      40,
    );
  });

  it("allows concurrent exact capacity reservations (50 + 50)", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 0 }),
    ]);

    const results = await Promise.all([
      repository.reserveAvailableQuantity(INVENTORY_ID, 50),
      repository.reserveAvailableQuantity(INVENTORY_ID, 50),
    ]);

    const successes = results.filter((result) => result !== null);
    expect(successes).toHaveLength(2);
    expect((await repository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      100,
    );
  });

  it("rejects concurrent oversubscription (80 + 80 against 100)", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 0 }),
    ]);

    const results = await Promise.all([
      repository.reserveAvailableQuantity(INVENTORY_ID, 80),
      repository.reserveAvailableQuantity(INVENTORY_ID, 80),
    ]);

    const successes = results.filter((result) => result !== null);
    const failures = results.filter((result) => result === null);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect((await repository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      80,
    );
  });

  it("rejects concurrent over-capacity pair (60 + 60 against 100)", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 0 }),
    ]);

    const results = await Promise.all([
      repository.reserveAvailableQuantity(INVENTORY_ID, 60),
      repository.reserveAvailableQuantity(INVENTORY_ID, 60),
    ]);

    expect(results.filter((result) => result !== null)).toHaveLength(1);
    expect(results.filter((result) => result === null)).toHaveLength(1);
    expect((await repository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      60,
    );
  });

  it("returns null for inactive inventory", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([
      buildInventoryEntity({
        quantityOnHand: 100,
        reservedQuantity: 0,
        isActive: false,
      }),
    ]);

    await expect(
      repository.reserveAvailableQuantity(INVENTORY_ID, 10),
    ).resolves.toBeNull();
  });
});
