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
  toDisposeAssetData,
  toUserId,
} from "../mappers/asset.mapper";
import {
  AssetIdParamSchema,
  DisposeAssetSchema,
  type AssetIdParamInput,
  type DisposeAssetInput,
} from "../schemas/asset.schemas";
import { toAssetAuditValues } from "./asset-audit.mapper";
import {
  ASSET_ENTITY_NAME,
  ASSET_MODULE,
} from "./asset-service.constants";
import type { IAssetTransactionRunner } from "./asset-transaction.runner";

export class DisposeAssetService {
  constructor(private readonly transactionRunner: IAssetTransactionRunner) {}

  async execute(
    params: AssetIdParamInput,
    input: DisposeAssetInput,
  ): Promise<AssetDto> {
    const { id } = parseRequest(AssetIdParamSchema, params);
    const data = parseRequest(DisposeAssetSchema, input);
    const assetId = toAssetId(id);

    return this.transactionRunner.run(
      async ({ assetRepository, auditLogger, userId }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to dispose asset",
          });
        }

        const existing = await assetRepository.findById(assetId);

        if (existing === null) {
          throw new NotFoundError({
            message: "Asset not found",
            details: { id },
          });
        }

        const disposeData = toDisposeAssetData(data, toUserId(userId));

        let disposed;

        try {
          disposed = existing.withDisposed(disposeData);
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

        const previousValues = toAssetAuditValues(existing);
        const updated = await assetRepository.updateAfterDispose(
          assetId,
          disposeData,
        );

        await auditLogger.log({
          module: ASSET_MODULE,
          entityName: ASSET_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toAssetAuditValues(disposed),
        });

        return toAssetDto(updated);
      },
    );
  }
}
