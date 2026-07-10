import type { AssetApplicationServices as AssetApplicationServicesBase } from "@/modules/asset/application/services/asset-application-services.interface";
import { AddMaintenanceHistoryService } from "@/modules/asset/application/services/add-maintenance-history.service";
import {
  AssetService,
} from "@/modules/asset/application/services/asset.service";
import type { IAssetService } from "@/modules/asset/application/services/asset-application-services.interface";
import { CreateAssetService } from "@/modules/asset/application/services/create-asset.service";
import { DisposeAssetService } from "@/modules/asset/application/services/dispose-asset.service";
import { GetAssetByIdService } from "@/modules/asset/application/services/get-asset-by-id.service";
import { ListAssetsService } from "@/modules/asset/application/services/list-assets.service";
import { TransferAssetService } from "@/modules/asset/application/services/transfer-asset.service";
import { UpdateAssetService } from "@/modules/asset/application/services/update-asset.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createAssetRepositoryFromSharedDeps } from "./create-asset.repository";
import { createAssetTransactionRunner } from "./create-asset-transaction.runner";

export type { AssetApplicationServicesBase as AssetApplicationServices };

export interface WiredAssetApplicationServices
  extends AssetApplicationServicesBase {
  assetService: IAssetService;
}

export function createAssetApplicationServices(
  deps: SharedDeps,
  userId?: string,
): WiredAssetApplicationServices {
  const repository = createAssetRepositoryFromSharedDeps(deps);
  const transactionRunner = createAssetTransactionRunner(deps, { userId });

  const getAssetById = new GetAssetByIdService(repository);
  const listAssets = new ListAssetsService(repository);
  const createAsset = new CreateAssetService(transactionRunner);
  const updateAsset = new UpdateAssetService(transactionRunner);
  const transferAsset = new TransferAssetService(transactionRunner);
  const disposeAsset = new DisposeAssetService(transactionRunner);
  const addMaintenanceHistory = new AddMaintenanceHistoryService(
    transactionRunner,
  );

  return {
    getAssetById,
    listAssets,
    createAsset,
    updateAsset,
    transferAsset,
    disposeAsset,
    addMaintenanceHistory,
    assetService: new AssetService(
      getAssetById,
      listAssets,
      createAsset,
      updateAsset,
      transferAsset,
      disposeAsset,
      addMaintenanceHistory,
    ),
  };
}
