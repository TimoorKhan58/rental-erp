import {
  postAssetPurchaseJournal,
  voidOperationalJournals,
} from "@/modules/accounting/application/services/operational-journal-posting.service";
import { toUserId as toAccountingUserId } from "@/modules/accounting/application/mappers/journal-entry.mapper";
import {
  AssetInvalidStatusError,
  AssetInvariantError,
} from "@/modules/asset/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { AssetDto } from "../dtos/asset.dto";
import {
  toAssetDto,
  toAssetId,
  toUpdateAssetData,
} from "../mappers/asset.mapper";
import {
  AssetIdParamSchema,
  UpdateAssetSchema,
  type AssetIdParamInput,
  type UpdateAssetInput,
} from "../schemas/asset.schemas";
import { toAssetAuditValues } from "./asset-audit.mapper";
import {
  ASSET_ENTITY_NAME,
  ASSET_MODULE,
} from "./asset-service.constants";
import type { IAssetTransactionRunner } from "./asset-transaction.runner";

export class UpdateAssetService {
  constructor(private readonly transactionRunner: IAssetTransactionRunner) {}

  async execute(
    params: AssetIdParamInput,
    input: UpdateAssetInput,
  ): Promise<AssetDto> {
    const { id } = parseRequest(AssetIdParamSchema, params);
    const data = parseRequest(UpdateAssetSchema, input);
    const assetId = toAssetId(id);
    const updateData = toUpdateAssetData(data);

    return this.transactionRunner.run(
      async ({
        assetRepository,
        categoryRepository,
        warehouseRepository,
        accountRepository,
        journalEntryRepository,
        auditLogger,
        userId,
      }) => {
        const existing = await assetRepository.findById(assetId);

        if (existing === null) {
          throw new NotFoundError({
            message: "Asset not found",
            details: { id },
          });
        }

        if (updateData.categoryId !== undefined) {
          const category = await categoryRepository.findById(
            updateData.categoryId,
          );

          if (category === null) {
            throw new NotFoundError({
              message: "Asset category not found",
              details: { categoryId: updateData.categoryId },
            });
          }
        }

        if (updateData.warehouseId !== undefined) {
          const warehouse = await warehouseRepository.findById(
            updateData.warehouseId,
          );

          if (warehouse === null) {
            throw new NotFoundError({
              message: "Warehouse not found",
              details: { warehouseId: updateData.warehouseId },
            });
          }
        }

        let validatedAsset;

        try {
          validatedAsset = existing.withUpdated(updateData);
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

        const previousValues = toAssetAuditValues(existing);
        const updated = await assetRepository.update(assetId, updateData);

        // Books: a corrected price or date replaces the purchase entry.
        const costChanged =
          updated.purchaseCost !== existing.purchaseCost ||
          updated.purchaseDate.getTime() !== existing.purchaseDate.getTime();
        if (
          costChanged &&
          userId !== undefined &&
          accountRepository !== undefined &&
          journalEntryRepository !== undefined
        ) {
          await voidOperationalJournals(journalEntryRepository, "OTHER", updated.id);
          await postAssetPurchaseJournal(
            { accountRepository, journalEntryRepository, userId: toAccountingUserId(userId) },
            { assetId: updated.id, assetCode: updated.assetCode, date: updated.purchaseDate, amount: updated.purchaseCost },
          );
        }

        await auditLogger.log({
          module: ASSET_MODULE,
          entityName: ASSET_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toAssetAuditValues(validatedAsset),
        });

        return toAssetDto(updated);
      },
    );
  }
}
