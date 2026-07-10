import { describe, expect, it } from "vitest";

import {
  AddMaintenanceHistorySchema,
  AssetIdParamSchema,
  CreateAssetSchema,
  DisposeAssetSchema,
  TransferAssetSchema,
  UpdateAssetSchema,
} from "@/modules/asset/application/schemas/asset.schemas";
import { ListAssetsSchema } from "@/modules/asset/application/schemas/list-assets.schema";
import { parseRequest } from "@/shared/application/validation";

import {
  ASSET_ID,
  CATEGORY_ID,
  OTHER_WAREHOUSE_ID,
  VALID_CREATE_INPUT,
  VALID_DISPOSE_INPUT,
  VALID_MAINTENANCE_INPUT,
  VALID_TRANSFER_INPUT,
  WAREHOUSE_ID,
} from "./helpers/asset.fixtures";

describe("Asset validation schemas", () => {
  it("accepts valid create payload", () => {
    const result = parseRequest(CreateAssetSchema, VALID_CREATE_INPUT);
    expect(result.assetCode).toBe("AST-001");
    expect(result.categoryId).toBe(CATEGORY_ID);
  });

  it("accepts create payload without optional fields", () => {
    const input = {
      assetCode: VALID_CREATE_INPUT.assetCode,
      name: VALID_CREATE_INPUT.name,
      categoryId: VALID_CREATE_INPUT.categoryId,
      purchaseDate: VALID_CREATE_INPUT.purchaseDate,
      purchaseCost: VALID_CREATE_INPUT.purchaseCost,
      residualValue: VALID_CREATE_INPUT.residualValue,
      usefulLifeMonths: VALID_CREATE_INPUT.usefulLifeMonths,
      warehouseId: VALID_CREATE_INPUT.warehouseId,
    };
    const result = parseRequest(CreateAssetSchema, input);

    expect(result.serialNumber).toBeUndefined();
    expect(result.notes).toBeUndefined();
  });

  it("rejects invalid asset code", () => {
    expect(() =>
      parseRequest(CreateAssetSchema, { ...VALID_CREATE_INPUT, assetCode: "" }),
    ).toThrow();
  });

  it("rejects negative purchase cost", () => {
    expect(() =>
      parseRequest(CreateAssetSchema, {
        ...VALID_CREATE_INPUT,
        purchaseCost: -1,
      }),
    ).toThrow();
  });

  it("rejects zero useful life months", () => {
    expect(() =>
      parseRequest(CreateAssetSchema, {
        ...VALID_CREATE_INPUT,
        usefulLifeMonths: 0,
      }),
    ).toThrow();
  });

  it("accepts valid asset id param", () => {
    const result = parseRequest(AssetIdParamSchema, { id: ASSET_ID });
    expect(result.id).toBe(ASSET_ID);
  });

  it("rejects invalid asset id param", () => {
    expect(() => parseRequest(AssetIdParamSchema, { id: "bad-id" })).toThrow();
  });

  it("accepts valid update payload", () => {
    const result = parseRequest(UpdateAssetSchema, { name: "Updated" });
    expect(result.name).toBe("Updated");
  });

  it("rejects empty update payload", () => {
    expect(() => parseRequest(UpdateAssetSchema, {})).toThrow();
  });

  it("accepts valid transfer payload", () => {
    const result = parseRequest(TransferAssetSchema, VALID_TRANSFER_INPUT);
    expect(result.toWarehouseId).toBe(OTHER_WAREHOUSE_ID);
  });

  it("rejects transfer without destination warehouse", () => {
    expect(() =>
      parseRequest(TransferAssetSchema, {
        transferDate: VALID_TRANSFER_INPUT.transferDate,
      }),
    ).toThrow();
  });

  it("accepts valid dispose payload", () => {
    const result = parseRequest(DisposeAssetSchema, VALID_DISPOSE_INPUT);
    expect(result.disposalAmount).toBe(25000);
  });

  it("accepts dispose payload without optional amount", () => {
    const result = parseRequest(DisposeAssetSchema, {
      disposalDate: VALID_DISPOSE_INPUT.disposalDate,
    });
    expect(result.disposalAmount).toBeUndefined();
  });

  it("accepts valid maintenance payload", () => {
    const result = parseRequest(
      AddMaintenanceHistorySchema,
      VALID_MAINTENANCE_INPUT,
    );
    expect(result.description).toBe("Annual inspection");
  });

  it("rejects maintenance without description", () => {
    expect(() =>
      parseRequest(AddMaintenanceHistorySchema, {
        serviceDate: VALID_MAINTENANCE_INPUT.serviceDate,
        cost: 100,
      }),
    ).toThrow();
  });

  it("accepts valid pagination input", () => {
    const result = parseRequest(ListAssetsSchema, {
      page: "1",
      pageSize: "20",
      search: "Forklift",
      status: "ACTIVE",
      categoryId: CATEGORY_ID,
      warehouseId: WAREHOUSE_ID,
    });
    expect(result.page).toBe(1);
    expect(result.search).toBe("Forklift");
    expect(result.status).toBe("ACTIVE");
  });

  it("rejects invalid pagination page", () => {
    expect(() =>
      parseRequest(ListAssetsSchema, { page: 0, pageSize: 20 }),
    ).toThrow();
  });

  it("rejects invalid status filter", () => {
    expect(() =>
      parseRequest(ListAssetsSchema, {
        page: 1,
        pageSize: 20,
        status: "INVALID",
      }),
    ).toThrow();
  });

  it("rejects overly long search term", () => {
    expect(() =>
      parseRequest(ListAssetsSchema, {
        page: 1,
        pageSize: 20,
        search: "x".repeat(201),
      }),
    ).toThrow();
  });

  it("rejects negative maintenance cost", () => {
    expect(() =>
      parseRequest(AddMaintenanceHistorySchema, {
        ...VALID_MAINTENANCE_INPUT,
        cost: -1,
      }),
    ).toThrow();
  });
});
