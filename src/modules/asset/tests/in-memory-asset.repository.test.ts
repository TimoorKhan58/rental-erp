import { describe, expect, it } from "vitest";

import { InMemoryAssetRepository } from "./helpers/in-memory-asset.repository";
import {
  ASSET_ID,
  OTHER_ASSET_ID,
  OTHER_WAREHOUSE_ID,
  USER_ID,
  VALID_DISPOSE_INPUT,
  VALID_MAINTENANCE_INPUT,
  VALID_TRANSFER_INPUT,
  buildAssetEntity,
  buildCreateAssetData,
  buildDisposedAssetEntity,
} from "./helpers/asset.fixtures";

describe("InMemoryAssetRepository", () => {
  it("finds by asset code", async () => {
    const repository = new InMemoryAssetRepository();
    repository.seed([buildAssetEntity()]);

    const found = await repository.findByAssetCode("AST-001");

    expect(found?.id).toBe(ASSET_ID);
  });

  it("creates asset in active status", async () => {
    const repository = new InMemoryAssetRepository();

    const created = await repository.create(buildCreateAssetData());

    expect(created.status).toBe("ACTIVE");
    expect(created.currentBookValue).toBe(created.purchaseCost);
    expect(repository.count()).toBe(1);
  });

  it("updates asset fields", async () => {
    const repository = new InMemoryAssetRepository();
    repository.seed([buildAssetEntity()]);

    const updated = await repository.update(ASSET_ID, { name: "Updated" });

    expect(updated.name).toBe("Updated");
  });

  it("records transfers and updates warehouse", async () => {
    const repository = new InMemoryAssetRepository();
    repository.seed([buildAssetEntity()]);

    await repository.createTransfer({
      assetId: ASSET_ID,
      fromWarehouseId: buildAssetEntity().warehouseId,
      toWarehouseId: OTHER_WAREHOUSE_ID,
      transferDate: new Date(VALID_TRANSFER_INPUT.transferDate),
      reason: VALID_TRANSFER_INPUT.reason,
      transferredById: USER_ID,
    });
    const updated = await repository.updateAfterTransfer(ASSET_ID, {
      toWarehouseId: OTHER_WAREHOUSE_ID,
      transferDate: new Date(VALID_TRANSFER_INPUT.transferDate),
      transferredById: USER_ID,
    });

    expect(updated.warehouseId).toBe(OTHER_WAREHOUSE_ID);
    expect(repository.transferCount(ASSET_ID)).toBe(1);
  });

  it("records maintenance history", async () => {
    const repository = new InMemoryAssetRepository();
    repository.seed([buildAssetEntity()]);

    await repository.createMaintenanceHistory(ASSET_ID, {
      serviceDate: new Date(VALID_MAINTENANCE_INPUT.serviceDate),
      vendor: VALID_MAINTENANCE_INPUT.vendor,
      cost: VALID_MAINTENANCE_INPUT.cost,
      description: VALID_MAINTENANCE_INPUT.description,
      completedById: USER_ID,
      setUnderMaintenance: true,
    });
    const updated = await repository.updateAfterMaintenance(ASSET_ID, {
      serviceDate: new Date(VALID_MAINTENANCE_INPUT.serviceDate),
      cost: VALID_MAINTENANCE_INPUT.cost,
      description: VALID_MAINTENANCE_INPUT.description,
      completedById: USER_ID,
      setUnderMaintenance: true,
    });

    expect(updated.status).toBe("UNDER_MAINTENANCE");
    expect(repository.maintenanceCount(ASSET_ID)).toBe(1);
  });

  it("disposes asset", async () => {
    const repository = new InMemoryAssetRepository();
    repository.seed([buildAssetEntity()]);

    const updated = await repository.updateAfterDispose(ASSET_ID, {
      disposalDate: new Date(VALID_DISPOSE_INPUT.disposalDate),
      disposalAmount: VALID_DISPOSE_INPUT.disposalAmount,
      disposalReason: VALID_DISPOSE_INPUT.disposalReason,
      disposedById: USER_ID,
    });

    expect(updated.status).toBe("DISPOSED");
  });

  it("filters paged results by status", async () => {
    const repository = new InMemoryAssetRepository();
    repository.seed([
      buildAssetEntity(),
      buildDisposedAssetEntity({ id: OTHER_ASSET_ID }),
    ]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "DISPOSED",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("DISPOSED");
  });

  it("finds transfers and maintenance by asset id", async () => {
    const repository = new InMemoryAssetRepository();
    repository.seed([buildAssetEntity()]);

    await repository.createTransfer({
      assetId: ASSET_ID,
      fromWarehouseId: buildAssetEntity().warehouseId,
      toWarehouseId: OTHER_WAREHOUSE_ID,
      transferDate: new Date(VALID_TRANSFER_INPUT.transferDate),
      transferredById: USER_ID,
    });
    await repository.createMaintenanceHistory(ASSET_ID, {
      serviceDate: new Date(VALID_MAINTENANCE_INPUT.serviceDate),
      cost: VALID_MAINTENANCE_INPUT.cost,
      description: VALID_MAINTENANCE_INPUT.description,
      completedById: USER_ID,
    });

    const transfers = await repository.findTransfersByAssetId(ASSET_ID);
    const maintenance = await repository.findMaintenanceHistoryByAssetId(
      ASSET_ID,
    );

    expect(transfers).toHaveLength(1);
    expect(maintenance).toHaveLength(1);
  });
});
