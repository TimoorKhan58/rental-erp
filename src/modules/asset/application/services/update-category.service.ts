import { parseRequest } from "@/shared/application/validation";
import { ConflictError, NotFoundError } from "@/shared/infrastructure/errors";

import type { AssetCategoryDto } from "../dtos/asset-category.dto";
import {
  toAssetCategoryDto,
  toAssetCategoryId,
  toUpdateAssetCategoryData,
} from "../mappers/asset-category.mapper";
import {
  AssetCategoryIdParamSchema,
  UpdateAssetCategorySchema,
  type AssetCategoryIdParamInput,
  type UpdateAssetCategoryInput,
} from "../schemas/asset-category.schemas";
import { toAssetCategoryAuditValues } from "./category-audit.mapper";
import {
  ASSET_CATEGORY_ENTITY_NAME,
  ASSET_CATEGORY_MODULE,
} from "./category-service.constants";
import type { ICategoryTransactionRunner } from "./category-transaction.runner";

export class UpdateCategoryService {
  constructor(private readonly transactionRunner: ICategoryTransactionRunner) {}

  async execute(
    params: AssetCategoryIdParamInput,
    input: UpdateAssetCategoryInput,
  ): Promise<AssetCategoryDto> {
    const { id } = parseRequest(AssetCategoryIdParamSchema, params);
    const data = parseRequest(UpdateAssetCategorySchema, input);
    const categoryId = toAssetCategoryId(id);
    const updateData = toUpdateAssetCategoryData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(categoryId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Asset category not found",
          details: { id },
        });
      }

      if (updateData.name !== undefined) {
        const duplicate = await repository.findByName(updateData.name);

        if (duplicate !== null && duplicate.id !== categoryId) {
          throw new ConflictError({
            message: "Asset category name already exists",
            details: { name: updateData.name },
          });
        }
      }

      const previousValues = toAssetCategoryAuditValues(existing);
      const updated = await repository.update(categoryId, updateData);

      await auditLogger.log({
        module: ASSET_CATEGORY_MODULE,
        entityName: ASSET_CATEGORY_ENTITY_NAME,
        recordId: updated.id,
        action: "UPDATE",
        status: "SUCCESS",
        oldValues: previousValues,
        newValues: toAssetCategoryAuditValues(updated),
      });

      return toAssetCategoryDto(updated);
    });
  }
}
