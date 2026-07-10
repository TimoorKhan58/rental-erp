import { describe, expect, it } from "vitest";

import {
  AssetCategory,
  AssetCategoryDomainError,
  AssetCategoryInvariantError,
  toUpdatedAssetCategoryProps,
} from "@/modules/asset/domain";

import {
  CATEGORY_ID,
  buildCategoryEntity,
  buildCreateCategoryData,
} from "../tests/helpers/asset-category.fixtures";

describe("AssetCategory entity", () => {
  it("creates normalized category props", () => {
    const props = AssetCategory.create(buildCreateCategoryData());

    expect(props.name).toBe("Equipment");
    expect(props.description).toBe("Heavy machinery and tools");
    expect(props.isActive).toBe(true);
  });

  it("trims required name", () => {
    const props = AssetCategory.create(
      buildCreateCategoryData({ name: "  Vehicles  " }),
    );

    expect(props.name).toBe("Vehicles");
  });

  it("rejects empty name", () => {
    expect(() =>
      AssetCategory.create(buildCreateCategoryData({ name: "   " })),
    ).toThrow(AssetCategoryInvariantError);
  });

  it("normalizes blank description to null", () => {
    const props = AssetCategory.create(
      buildCreateCategoryData({ description: "   " }),
    );

    expect(props.description).toBeNull();
  });

  it("defaults isActive to true", () => {
    const props = AssetCategory.create({
      name: "Tools",
    });

    expect(props.isActive).toBe(true);
  });

  it("reconstitutes persisted category", () => {
    const created = AssetCategory.create(buildCreateCategoryData());
    const now = new Date("2026-01-15T10:00:00.000Z");

    const category = AssetCategory.reconstitute({
      id: CATEGORY_ID,
      ...created,
      createdAt: now,
      updatedAt: now,
    });

    expect(category.toProps().name).toBe("Equipment");
  });

  it("updates category props via helper", () => {
    const category = buildCategoryEntity();
    const updatedProps = toUpdatedAssetCategoryProps(category, {
      name: "Updated Equipment",
      isActive: false,
    });

    expect(updatedProps.name).toBe("Updated Equipment");
    expect(updatedProps.isActive).toBe(false);
  });
});

describe("AssetCategory domain errors", () => {
  it("creates domain error with name", () => {
    const error = new AssetCategoryDomainError("test error");
    expect(error.name).toBe("AssetCategoryDomainError");
  });

  it("creates invariant error with optional field", () => {
    const error = new AssetCategoryInvariantError("invalid", "name");
    expect(error.field).toBe("name");
  });
});
