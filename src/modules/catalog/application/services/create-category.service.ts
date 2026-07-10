import { parseRequest } from "@/shared/application/validation";
import { ConflictError } from "@/shared/infrastructure/errors";

import type { CategoryDto } from "../dtos/category.dto";
import {
  toCreateCategoryData,
  toCategoryDto,
} from "../mappers/category.mapper";
import {
  CreateCategorySchema,
  type CreateCategoryInput,
} from "../schemas/category.schemas";
import { toCategoryAuditValues } from "./category-audit.mapper";
import {
  CATEGORY_ENTITY_NAME,
  CATEGORY_MODULE,
} from "./category-service.constants";
import type { ICategoryTransactionRunner } from "./category-transaction.runner";

export class CreateCategoryService {
  constructor(private readonly transactionRunner: ICategoryTransactionRunner) {}

  async execute(input: CreateCategoryInput): Promise<CategoryDto> {
    const data = parseRequest(CreateCategorySchema, input);
    const createData = toCreateCategoryData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existingName = await repository.findByName(createData.name);

      if (existingName !== null) {
        throw new ConflictError({
          message: "Category name already exists",
          details: { name: createData.name },
        });
      }
      const entity = await repository.create(createData);

      await auditLogger.log({
        module: CATEGORY_MODULE,
        entityName: CATEGORY_ENTITY_NAME,
        recordId: entity.id,
        action: "CREATE",
        status: "SUCCESS",
        newValues: toCategoryAuditValues(entity),
      });

      return toCategoryDto(entity);
    });
  }
}
