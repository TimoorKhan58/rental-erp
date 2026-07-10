import { describe, expect, it } from "vitest";

import { InMemoryAssetCategoryRepository } from "./helpers/in-memory-asset-category.repository";
import {
  CATEGORY_ID,
  OTHER_CATEGORY_ID,
  buildCategoryEntity,
  buildCreateCategoryData,
} from "./helpers/asset-category.fixtures";

describe("InMemoryAssetCategoryRepository", () => {
  it("finds by name case-insensitively", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([buildCategoryEntity()]);

    const found = await repository.findByName("equipment");

    expect(found?.id).toBe(CATEGORY_ID);
  });

  it("creates category", async () => {
    const repository = new InMemoryAssetCategoryRepository();

    const created = await repository.create(buildCreateCategoryData());

    expect(created.name).toBe("Equipment");
    expect(repository.count()).toBe(1);
  });

  it("updates category fields", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([buildCategoryEntity()]);

    const updated = await repository.update(CATEGORY_ID, {
      name: "Updated Equipment",
    });

    expect(updated.name).toBe("Updated Equipment");
  });

  it("deletes category", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([buildCategoryEntity()]);

    await repository.delete(CATEGORY_ID);

    expect(repository.count()).toBe(0);
  });

  it("filters paged results by active status", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([
      buildCategoryEntity(),
      buildCategoryEntity({
        id: OTHER_CATEGORY_ID,
        name: "Retired",
        isActive: false,
      }),
    ]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      isActive: false,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Retired");
  });

  it("searches by name and description", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([
      buildCategoryEntity(),
      buildCategoryEntity({
        id: OTHER_CATEGORY_ID,
        name: "Vehicles",
        description: "Fleet transport assets",
      }),
    ]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "asc",
      search: "fleet",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Vehicles");
  });

  it("supports snapshot and restore", () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([buildCategoryEntity()]);
    const snapshot = repository.snapshot();

    repository.seed([]);
    expect(repository.count()).toBe(0);

    repository.restore(snapshot);
    expect(repository.count()).toBe(1);
  });

  it("checks existence by id", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([buildCategoryEntity()]);

    expect(await repository.exists(CATEGORY_ID)).toBe(true);
    expect(await repository.exists(OTHER_CATEGORY_ID)).toBe(false);
  });
});
