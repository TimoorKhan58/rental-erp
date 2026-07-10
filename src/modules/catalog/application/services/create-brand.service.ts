import { parseRequest } from "@/shared/application/validation";
import { ConflictError } from "@/shared/infrastructure/errors";

import type { BrandDto } from "../dtos/brand.dto";
import {
  toCreateBrandData,
  toBrandDto,
} from "../mappers/brand.mapper";
import {
  CreateBrandSchema,
  type CreateBrandInput,
} from "../schemas/brand.schemas";
import { toBrandAuditValues } from "./brand-audit.mapper";
import {
  BRAND_ENTITY_NAME,
  BRAND_MODULE,
} from "./brand-service.constants";
import type { IBrandTransactionRunner } from "./brand-transaction.runner";

export class CreateBrandService {
  constructor(private readonly transactionRunner: IBrandTransactionRunner) {}

  async execute(input: CreateBrandInput): Promise<BrandDto> {
    const data = parseRequest(CreateBrandSchema, input);
    const createData = toCreateBrandData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existingName = await repository.findByName(createData.name);

      if (existingName !== null) {
        throw new ConflictError({
          message: "Brand name already exists",
          details: { name: createData.name },
        });
      }
      const entity = await repository.create(createData);

      await auditLogger.log({
        module: BRAND_MODULE,
        entityName: BRAND_ENTITY_NAME,
        recordId: entity.id,
        action: "CREATE",
        status: "SUCCESS",
        newValues: toBrandAuditValues(entity),
      });

      return toBrandDto(entity);
    });
  }
}
