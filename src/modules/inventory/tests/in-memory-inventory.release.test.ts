import { describe, expect, it } from "vitest";

import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import {
  INVENTORY_ID,
  buildInventoryEntity,
} from "@/modules/inventory/tests/helpers/inventory.fixtures";

describe("InMemoryInventoryRepository.releaseReservedQuantity", () => {
  it("releases when reserved quantity allows", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 100 }),
    ]);

    const updated = await repository.releaseReservedQuantity(INVENTORY_ID, 40);

    expect(updated?.reservedQuantity).toBe(60);
    expect((await repository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      60,
    );
  });

  it("releases exact reserved quantity to zero", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 100 }),
    ]);

    const updated = await repository.releaseReservedQuantity(INVENTORY_ID, 100);

    expect(updated?.reservedQuantity).toBe(0);
    expect((await repository.findById(INVENTORY_ID))?.reservedQuantity).toBe(0);
  });

  it("returns null and leaves reserved unchanged when oversized", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 40 }),
    ]);

    const updated = await repository.releaseReservedQuantity(INVENTORY_ID, 50);

    expect(updated).toBeNull();
    expect((await repository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      40,
    );
  });

  it("releases on inactive inventory", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([
      buildInventoryEntity({
        quantityOnHand: 100,
        reservedQuantity: 40,
        isActive: false,
      }),
    ]);

    const updated = await repository.releaseReservedQuantity(INVENTORY_ID, 20);

    expect(updated?.reservedQuantity).toBe(20);
    expect(updated?.isActive).toBe(false);
    expect((await repository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      20,
    );
  });

  it("returns null for non-positive quantity", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 40 }),
    ]);

    await expect(
      repository.releaseReservedQuantity(INVENTORY_ID, 0),
    ).resolves.toBeNull();
    await expect(
      repository.releaseReservedQuantity(INVENTORY_ID, -1),
    ).resolves.toBeNull();
    expect((await repository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      40,
    );
  });

  it("returns null when inventory is missing", async () => {
    const repository = new InMemoryInventoryRepository();

    await expect(
      repository.releaseReservedQuantity(INVENTORY_ID, 10),
    ).resolves.toBeNull();
  });

  it("allows concurrent exact releases (50 + 50 from reserved 100)", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 100 }),
    ]);

    const results = await Promise.all([
      repository.releaseReservedQuantity(INVENTORY_ID, 50),
      repository.releaseReservedQuantity(INVENTORY_ID, 50),
    ]);

    const successes = results.filter((result) => result !== null);
    expect(successes).toHaveLength(2);
    expect((await repository.findById(INVENTORY_ID))?.reservedQuantity).toBe(0);
  });

  it("rejects concurrent oversubscription releases (80 + 80 from reserved 100)", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 100 }),
    ]);

    const results = await Promise.all([
      repository.releaseReservedQuantity(INVENTORY_ID, 80),
      repository.releaseReservedQuantity(INVENTORY_ID, 80),
    ]);

    const successes = results.filter((result) => result !== null);
    const failures = results.filter((result) => result === null);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect((await repository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      20,
    );
  });

  it("rejects concurrent over-reserved pair (60 + 60 from reserved 100)", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 100 }),
    ]);

    const results = await Promise.all([
      repository.releaseReservedQuantity(INVENTORY_ID, 60),
      repository.releaseReservedQuantity(INVENTORY_ID, 60),
    ]);

    expect(results.filter((result) => result !== null)).toHaveLength(1);
    expect(results.filter((result) => result === null)).toHaveLength(1);
    expect((await repository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      40,
    );
  });
});
