import {
  Asset,
  AssetInvariantError,
} from "@/modules/asset/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { AssetDto } from "../dtos/asset.dto";
import {
  toAssetDto,
  toAssetCategoryId,
  toCreateAssetData,
  toUserId,
  toWarehouseId,
} from "../mappers/asset.mapper";
import {
  CreateAssetSchema,
  type CreateAssetInput,
} from "../schemas/asset.schemas";
import { toAssetAuditValues } from "./asset-audit.mapper";
import {
  ASSET_ENTITY_NAME,
  ASSET_MODULE,
} from "./asset-service.constants";
import type { IAssetTransactionRunner } from "./asset-transaction.runner";

export class CreateAssetService {
  constructor(private readonly transactionRunner: IAssetTransactionRunner) {}

  async execute(input: CreateAssetInput): Promise<AssetDto> {
    const data = parseRequest(CreateAssetSchema, input);

    return this.transactionRunner.run(
      async ({
        assetRepository,
        categoryRepository,
        warehouseRepository,
        auditLogger,
        userId,
      }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to create asset",
          });
        }

        const createData = toCreateAssetData(data, toUserId(userId));

        try {
          Asset.create(createData);
        } catch (error) {
          if (error instanceof AssetInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        const category = await categoryRepository.findById(
          toAssetCategoryId(data.categoryId),
        );

        if (category === null) {
          throw new NotFoundError({
            message: "Asset category not found",
            details: { categoryId: data.categoryId },
          });
        }

        const warehouse = await warehouseRepository.findById(
          toWarehouseId(data.warehouseId),
        );

        if (warehouse === null) {
          throw new NotFoundError({
            message: "Warehouse not found",
            details: { warehouseId: data.warehouseId },
          });
        }

        const existingCode = await assetRepository.findByAssetCode(
          createData.assetCode,
        );

        if (existingCode !== null) {
          throw new ConflictError({
            message: "Asset code already exists",
            details: { assetCode: createData.assetCode },
          });
        }

        const asset = await assetRepository.create(createData);

        await auditLogger.log({
          module: ASSET_MODULE,
          entityName: ASSET_ENTITY_NAME,
          recordId: asset.id,
          action: "CREATE",
          status: "SUCCESS",
          newValues: toAssetAuditValues(asset),
        });

        return toAssetDto(asset);
      },
    );
  }
}
