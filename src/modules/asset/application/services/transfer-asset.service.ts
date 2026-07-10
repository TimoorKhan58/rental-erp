import { AssetInvalidStatusError } from "@/modules/asset/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { AssetDto } from "../dtos/asset.dto";
import {
  toAssetDto,
  toAssetId,
  toTransferAssetData,
  toUserId,
  toWarehouseId,
} from "../mappers/asset.mapper";
import {
  AssetIdParamSchema,
  TransferAssetSchema,
  type AssetIdParamInput,
  type TransferAssetInput,
} from "../schemas/asset.schemas";
import { toAssetAuditValues } from "./asset-audit.mapper";
import {
  ASSET_ENTITY_NAME,
  ASSET_MODULE,
} from "./asset-service.constants";
import type { IAssetTransactionRunner } from "./asset-transaction.runner";

export class TransferAssetService {
  constructor(private readonly transactionRunner: IAssetTransactionRunner) {}

  async execute(
    params: AssetIdParamInput,
    input: TransferAssetInput,
  ): Promise<AssetDto> {
    const { id } = parseRequest(AssetIdParamSchema, params);
    const data = parseRequest(TransferAssetSchema, input);
    const assetId = toAssetId(id);

    return this.transactionRunner.run(
      async ({
        assetRepository,
        warehouseRepository,
        auditLogger,
        userId,
      }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to transfer asset",
          });
        }

        const existing = await assetRepository.findById(assetId);

        if (existing === null) {
          throw new NotFoundError({
            message: "Asset not found",
            details: { id },
          });
        }

        const fromWarehouse = await warehouseRepository.findById(
          existing.warehouseId,
        );

        if (fromWarehouse === null) {
          throw new NotFoundError({
            message: "Source warehouse not found",
            details: { warehouseId: existing.warehouseId },
          });
        }

        const toWarehouse = await warehouseRepository.findById(
          toWarehouseId(data.toWarehouseId),
        );

        if (toWarehouse === null) {
          throw new NotFoundError({
            message: "Destination warehouse not found",
            details: { warehouseId: data.toWarehouseId },
          });
        }

        if (existing.warehouseId === toWarehouseId(data.toWarehouseId)) {
          throw new UnprocessableError({
            message: "Source and destination warehouses must be different",
            details: {
              fromWarehouseId: existing.warehouseId,
              toWarehouseId: data.toWarehouseId,
            },
          });
        }

        const transferData = toTransferAssetData(data, toUserId(userId));

        let transferred;

        try {
          transferred = existing.withTransferred(transferData);
        } catch (error) {
          if (error instanceof AssetInvalidStatusError) {
            throw new UnprocessableError({
              message: error.message,
              details: {
                currentStatus: error.currentStatus,
                action: error.action,
              },
            });
          }

          throw error;
        }

        await assetRepository.createTransfer({
          assetId: existing.id,
          fromWarehouseId: existing.warehouseId,
          ...transferData,
        });

        const previousValues = toAssetAuditValues(existing);
        const updated = await assetRepository.updateAfterTransfer(
          assetId,
          transferData,
        );

        await auditLogger.log({
          module: ASSET_MODULE,
          entityName: ASSET_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toAssetAuditValues(transferred),
        });

        return toAssetDto(updated);
      },
    );
  }
}
