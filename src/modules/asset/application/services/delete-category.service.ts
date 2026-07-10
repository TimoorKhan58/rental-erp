import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import { toAssetCategoryId } from "../mappers/asset-category.mapper";
import {
  AssetCategoryIdParamSchema,
  type AssetCategoryIdParamInput,
} from "../schemas/asset-category.schemas";
import { toAssetCategoryAuditValues } from "./category-audit.mapper";
import {
  ASSET_CATEGORY_ENTITY_NAME,
  ASSET_CATEGORY_MODULE,
} from "./category-service.constants";
import type { ICategoryTransactionRunner } from "./category-transaction.runner";

export class DeleteCategoryService {
  constructor(private readonly transactionRunner: ICategoryTransactionRunner) {}

  async execute(input: AssetCategoryIdParamInput): Promise<void> {
    const { id } = parseRequest(AssetCategoryIdParamSchema, input);
    const categoryId = toAssetCategoryId(id);

    await this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(categoryId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Asset category not found",
          details: { id },
        });
      }

      await repository.delete(categoryId);

      await auditLogger.log({
        module: ASSET_CATEGORY_MODULE,
        entityName: ASSET_CATEGORY_ENTITY_NAME,
        recordId: existing.id,
        action: "DELETE",
        status: "SUCCESS",
        oldValues: toAssetCategoryAuditValues(existing),
      });
    });
  }
}
