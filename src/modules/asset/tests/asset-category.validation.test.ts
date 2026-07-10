import { describe, expect, it } from "vitest";

import {
  AssetCategoryIdParamSchema,
  CreateAssetCategorySchema,
  UpdateAssetCategorySchema,
} from "@/modules/asset/application/schemas/asset-category.schemas";
import { ListAssetCategoriesSchema } from "@/modules/asset/application/schemas/list-asset-categories.schema";
import { parseRequest } from "@/shared/application/validation";

import {
  CATEGORY_ID,
  VALID_CREATE_CATEGORY_INPUT,
} from "./helpers/asset-category.fixtures";

describe("Asset category validation schemas", () => {
  it("accepts valid create payload", () => {
    const result = parseRequest(
      CreateAssetCategorySchema,
      VALID_CREATE_CATEGORY_INPUT,
    );
    expect(result.name).toBe("Equipment");
  });

  it("accepts create payload without optional description", () => {
    const result = parseRequest(CreateAssetCategorySchema, {
      name: VALID_CREATE_CATEGORY_INPUT.name,
    });
    expect(result.description).toBeUndefined();
  });

  it("rejects empty category name", () => {
    expect(() =>
      parseRequest(CreateAssetCategorySchema, {
        ...VALID_CREATE_CATEGORY_INPUT,
        name: "",
      }),
    ).toThrow();
  });

  it("accepts valid category id param", () => {
    const result = parseRequest(AssetCategoryIdParamSchema, { id: CATEGORY_ID });
    expect(result.id).toBe(CATEGORY_ID);
  });

  it("rejects invalid category id param", () => {
    expect(() =>
      parseRequest(AssetCategoryIdParamSchema, { id: "bad-id" }),
    ).toThrow();
  });

  it("accepts valid update payload", () => {
    const result = parseRequest(UpdateAssetCategorySchema, {
      name: "Updated",
    });
    expect(result.name).toBe("Updated");
  });

  it("rejects empty update payload", () => {
    expect(() => parseRequest(UpdateAssetCategorySchema, {})).toThrow();
  });

  it("accepts valid pagination input", () => {
    const result = parseRequest(ListAssetCategoriesSchema, {
      page: "1",
      pageSize: "20",
      search: "Equip",
      isActive: "true",
    });
    expect(result.page).toBe(1);
    expect(result.isActive).toBe(true);
  });

  it("rejects invalid pagination page", () => {
    expect(() =>
      parseRequest(ListAssetCategoriesSchema, { page: 0, pageSize: 20 }),
    ).toThrow();
  });

  it("rejects overly long search term", () => {
    expect(() =>
      parseRequest(ListAssetCategoriesSchema, {
        page: 1,
        pageSize: 20,
        search: "x".repeat(201),
      }),
    ).toThrow();
  });

  it("accepts inactive filter as false", () => {
    const result = parseRequest(ListAssetCategoriesSchema, {
      page: 1,
      pageSize: 20,
      isActive: "false",
    });
    expect(result.isActive).toBe(false);
  });

  it("accepts sortBy name", () => {
    const result = parseRequest(ListAssetCategoriesSchema, {
      page: 1,
      pageSize: 20,
      sortBy: "name",
      sortOrder: "asc",
    });
    expect(result.sortBy).toBe("name");
  });
});
