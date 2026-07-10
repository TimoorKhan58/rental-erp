import { describe, expect, it, vi } from "vitest";

import { AssetService } from "@/modules/asset/application/services/asset.service";

import {
  ASSET_ID,
  VALID_CREATE_INPUT,
  VALID_DISPOSE_INPUT,
  VALID_MAINTENANCE_INPUT,
  VALID_TRANSFER_INPUT,
} from "../tests/helpers/asset.fixtures";
import type {
  AddMaintenanceHistoryInput,
  CreateAssetInput,
  DisposeAssetInput,
  TransferAssetInput,
} from "@/modules/asset/application/schemas/asset.schemas";

const VALID_CREATE_SERVICE_INPUT =
  VALID_CREATE_INPUT as unknown as CreateAssetInput;
const VALID_TRANSFER_SERVICE_INPUT =
  VALID_TRANSFER_INPUT as unknown as TransferAssetInput;
const VALID_DISPOSE_SERVICE_INPUT =
  VALID_DISPOSE_INPUT as unknown as DisposeAssetInput;
const VALID_MAINTENANCE_SERVICE_INPUT =
  VALID_MAINTENANCE_INPUT as unknown as AddMaintenanceHistoryInput;

function createFacade() {
  const getAssetById = { execute: vi.fn() };
  const listAssets = { execute: vi.fn() };
  const createAsset = { execute: vi.fn() };
  const updateAsset = { execute: vi.fn() };
  const transferAsset = { execute: vi.fn() };
  const disposeAsset = { execute: vi.fn() };
  const addMaintenanceHistoryService = { execute: vi.fn() };

  const service = new AssetService(
    getAssetById as never,
    listAssets as never,
    createAsset as never,
    updateAsset as never,
    transferAsset as never,
    disposeAsset as never,
    addMaintenanceHistoryService as never,
  );

  return {
    service,
    getAssetById,
    listAssets,
    createAsset,
    updateAsset,
    transferAsset,
    disposeAsset,
    addMaintenanceHistoryService,
  };
}

describe("AssetService facade", () => {
  it("delegates getById", async () => {
    const { service, getAssetById } = createFacade();
    getAssetById.execute.mockResolvedValue({ id: ASSET_ID });

    await service.getById({ id: ASSET_ID });

    expect(getAssetById.execute).toHaveBeenCalledWith({ id: ASSET_ID });
  });

  it("delegates list", async () => {
    const { service, listAssets } = createFacade();
    listAssets.execute.mockResolvedValue({ items: [], meta: {} });

    await service.list({ page: 1, pageSize: 10, sortOrder: "desc" });

    expect(listAssets.execute).toHaveBeenCalled();
  });

  it("delegates create", async () => {
    const { service, createAsset } = createFacade();

    await service.create(VALID_CREATE_SERVICE_INPUT);

    expect(createAsset.execute).toHaveBeenCalled();
  });

  it("delegates update", async () => {
    const { service, updateAsset } = createFacade();

    await service.update({ id: ASSET_ID }, { name: "Updated" });

    expect(updateAsset.execute).toHaveBeenCalledWith(
      { id: ASSET_ID },
      { name: "Updated" },
    );
  });

  it("delegates transfer, dispose, and maintenance", async () => {
    const {
      service,
      transferAsset,
      disposeAsset,
      addMaintenanceHistoryService,
    } = createFacade();

    await service.transfer({ id: ASSET_ID }, VALID_TRANSFER_SERVICE_INPUT);
    await service.dispose({ id: ASSET_ID }, VALID_DISPOSE_SERVICE_INPUT);
    await service.addMaintenanceHistory(
      { id: ASSET_ID },
      VALID_MAINTENANCE_SERVICE_INPUT,
    );

    expect(transferAsset.execute).toHaveBeenCalled();
    expect(disposeAsset.execute).toHaveBeenCalled();
    expect(addMaintenanceHistoryService.execute).toHaveBeenCalled();
  });
});
