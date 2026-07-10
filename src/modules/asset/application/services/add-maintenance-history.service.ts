import {
  AssetInvalidStatusError,
  AssetInvariantError,
} from "@/modules/asset/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { AssetDto } from "../dtos/asset.dto";
import {
  toAddMaintenanceHistoryData,
  toAssetDto,
  toAssetId,
  toUserId,
} from "../mappers/asset.mapper";
import {
  AddMaintenanceHistorySchema,
  AssetIdParamSchema,
  type AddMaintenanceHistoryInput,
  type AssetIdParamInput,
} from "../schemas/asset.schemas";
import { toAssetAuditValues } from "./asset-audit.mapper";
import {
  ASSET_ENTITY_NAME,
  ASSET_MODULE,
} from "./asset-service.constants";
import type { IAssetTransactionRunner } from "./asset-transaction.runner";

export class AddMaintenanceHistoryService {
  constructor(private readonly transactionRunner: IAssetTransactionRunner) {}

  async execute(
    params: AssetIdParamInput,
    input: AddMaintenanceHistoryInput,
  ): Promise<AssetDto> {
    const { id } = parseRequest(AssetIdParamSchema, params);
    const data = parseRequest(AddMaintenanceHistorySchema, input);
    const assetId = toAssetId(id);

    return this.transactionRunner.run(
      async ({ assetRepository, auditLogger, userId }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to add maintenance history",
          });
        }

        const existing = await assetRepository.findById(assetId);

        if (existing === null) {
          throw new NotFoundError({
            message: "Asset not found",
            details: { id },
          });
        }

        const maintenanceData = toAddMaintenanceHistoryData(
          data,
          toUserId(userId),
        );

        let withStatus;

        try {
          withStatus = existing.withMaintenanceStatus(maintenanceData);
        } catch (error) {
          if (
            error instanceof AssetInvalidStatusError ||
            error instanceof AssetInvariantError
          ) {
            throw new UnprocessableError({
              message: error.message,
              details:
                error instanceof AssetInvariantError
                  ? { field: error.field }
                  : {
                      currentStatus:
                        error instanceof AssetInvalidStatusError
                          ? error.currentStatus
                          : undefined,
                      action:
                        error instanceof AssetInvalidStatusError
                          ? error.action
                          : undefined,
                    },
            });
          }

          throw error;
        }

        await assetRepository.createMaintenanceHistory(
          assetId,
          maintenanceData,
        );

        const previousValues = toAssetAuditValues(existing);
        const updated = await assetRepository.updateAfterMaintenance(
          assetId,
          maintenanceData,
        );

        await auditLogger.log({
          module: ASSET_MODULE,
          entityName: ASSET_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toAssetAuditValues(withStatus),
        });

        return toAssetDto(updated);
      },
    );
  }
}
