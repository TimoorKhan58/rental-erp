import { describe, expect, it } from "vitest";

import { Asset } from "@/modules/asset/domain/asset.entity";
import {
  AssetDomainError,
  AssetInvariantError,
  createAssetCode,
} from "@/modules/asset/domain";

import {
  ASSET_ID,
  CATEGORY_ID,
  USER_ID,
  WAREHOUSE_ID,
  buildAssetEntity,
  buildCreateAssetData,
} from "../tests/helpers/asset.fixtures";

describe("Asset entity", () => {
  it("creates normalized asset props", () => {
    const props = Asset.create(buildCreateAssetData());

    expect(props.name).toBe("Forklift Model X");
    expect(props.assetCode).toBe("AST-001");
    expect(props.categoryId).toBe(CATEGORY_ID);
    expect(props.createdById).toBe(USER_ID);
  });

  it("trims required text fields", () => {
    const props = Asset.create(
      buildCreateAssetData({ name: "  Trimmed Name  " }),
    );

    expect(props.name).toBe("Trimmed Name");
  });

  it("rejects empty name", () => {
    expect(() =>
      Asset.create(buildCreateAssetData({ name: "   " })),
    ).toThrow(AssetInvariantError);
  });

  it("normalizes optional serial number to null", () => {
    const props = Asset.create(buildCreateAssetData({ serialNumber: "   " }));

    expect(props.serialNumber).toBeNull();
  });

  it("normalizes optional notes to null", () => {
    const props = Asset.create(buildCreateAssetData({ notes: "   " }));

    expect(props.notes).toBeNull();
  });

  it("reconstitutes persisted asset", () => {
    const created = Asset.create(buildCreateAssetData());
    const now = new Date("2026-01-15T10:00:00.000Z");

    const asset = Asset.reconstitute({
      id: ASSET_ID,
      ...created,
      status: "ACTIVE",
      currentBookValue: created.purchaseCost,
      disposalDate: null,
      disposalAmount: null,
      disposalReason: null,
      disposedById: null,
      createdAt: now,
      updatedAt: now,
    });

    expect(asset.toProps().name).toBe("Forklift Model X");
    expect(asset.status).toBe("ACTIVE");
  });

  it("rejects future purchase date on create", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);

    expect(() =>
      Asset.create(buildCreateAssetData({ purchaseDate: future })),
    ).toThrow(AssetInvariantError);
  });

  it("rejects negative purchase cost", () => {
    expect(() =>
      Asset.create(buildCreateAssetData({ purchaseCost: -1 })),
    ).toThrow(AssetInvariantError);
  });

  it("rejects negative residual value", () => {
    expect(() =>
      Asset.create(buildCreateAssetData({ residualValue: -1 })),
    ).toThrow(AssetInvariantError);
  });

  it("rejects residual value exceeding purchase cost", () => {
    expect(() =>
      Asset.create(
        buildCreateAssetData({ purchaseCost: 1000, residualValue: 1001 }),
      ),
    ).toThrow(AssetInvariantError);
  });

  it("rejects zero useful life months", () => {
    expect(() =>
      Asset.create(buildCreateAssetData({ usefulLifeMonths: 0 })),
    ).toThrow(AssetInvariantError);
  });

  it("allows zero residual value", () => {
    const props = Asset.create(
      buildCreateAssetData({ residualValue: 0 }),
    );

    expect(props.residualValue).toBe(0);
  });

  it("allows equal residual and purchase cost", () => {
    const props = Asset.create(
      buildCreateAssetData({ purchaseCost: 1000, residualValue: 1000 }),
    );

    expect(props.residualValue).toBe(1000);
  });

  it("preserves assigned employee when provided", () => {
    const props = Asset.create(
      buildCreateAssetData({ assignedEmployeeId: USER_ID }),
    );

    expect(props.assignedEmployeeId).toBe(USER_ID);
  });

  it("defaults assigned employee to null", () => {
    const props = Asset.create(buildCreateAssetData());

    expect(props.assignedEmployeeId).toBeNull();
  });
});

describe("Asset value objects", () => {
  it("accepts valid asset code", () => {
    expect(createAssetCode("AST-001")).toBe("AST-001");
  });

  it("trims asset code", () => {
    expect(createAssetCode("  AST-002  ")).toBe("AST-002");
  });

  it("rejects empty asset code", () => {
    expect(() => createAssetCode("  ")).toThrow(AssetInvariantError);
  });

  it("rejects overly long asset code", () => {
    expect(() => createAssetCode("x".repeat(51))).toThrow(AssetInvariantError);
  });
});

describe("Asset domain errors", () => {
  it("creates domain error with name", () => {
    const error = new AssetDomainError("test error");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AssetDomainError");
  });

  it("creates invariant error with field", () => {
    const error = new AssetInvariantError("invalid", "purchaseCost");
    expect(error.field).toBe("purchaseCost");
  });
});

describe("Asset entity updates", () => {
  it("updates mutable fields on active asset", () => {
    const asset = buildAssetEntity();
    const updated = asset.withUpdated({ name: "Updated Forklift" });

    expect(updated.name).toBe("Updated Forklift");
    expect(updated.warehouseId).toBe(WAREHOUSE_ID);
  });

  it("validates purchase cost on update", () => {
    const asset = buildAssetEntity();

    expect(() => asset.withUpdated({ purchaseCost: -10 })).toThrow(
      AssetInvariantError,
    );
  });

  it("validates residual value against purchase cost on update", () => {
    const asset = buildAssetEntity();

    expect(() =>
      asset.withUpdated({ purchaseCost: 100, residualValue: 200 }),
    ).toThrow(AssetInvariantError);
  });
});
