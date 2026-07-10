import { parseRequest } from "@/shared/application/validation";
import { ConflictError } from "@/shared/infrastructure/errors";

import type { AssetCategoryDto } from "../dtos/asset-category.dto";
import {
  toAssetCategoryDto,
  toCreateAssetCategoryData,
} from "../mappers/asset-category.mapper";
import {
  CreateAssetCategorySchema,
  type CreateAssetCategoryInput,
} from "../schemas/asset-category.schemas";
import { toAssetCategoryAuditValues } from "./category-audit.mapper";
import {
  ASSET_CATEGORY_ENTITY_NAME,
  ASSET_CATEGORY_MODULE,
} from "./category-service.constants";
import type { ICategoryTransactionRunner } from "./category-transaction.runner";

export class CreateCategoryService {
  constructor(private readonly transactionRunner: ICategoryTransactionRunner) {}

  async execute(input: CreateAssetCategoryInput): Promise<AssetCategoryDto> {
    const data = parseRequest(CreateAssetCategorySchema, input);
    const createData = toCreateAssetCategoryData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existingName = await repository.findByName(createData.name);

      if (existingName !== null) {
        throw new ConflictError({
          message: "Asset category name already exists",
          details: { name: createData.name },
        });
      }

      const category = await repository.create(createData);

      await auditLogger.log({
        module: ASSET_CATEGORY_MODULE,
        entityName: ASSET_CATEGORY_ENTITY_NAME,
        recordId: category.id,
        action: "CREATE",
        status: "SUCCESS",
        newValues: toAssetCategoryAuditValues(category),
      });

      return toAssetCategoryDto(category);
    });
  }
}
