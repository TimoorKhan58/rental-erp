import { parseRequest } from "@/shared/application/validation";
import { ConflictError, NotFoundError } from "@/shared/infrastructure/errors";

import type { BrandDto } from "../dtos/brand.dto";
import {
  toBrandDto,
  toBrandId,
  toUpdateBrandData,
} from "../mappers/brand.mapper";
import {
  BrandIdParamSchema,
  UpdateBrandSchema,
  type BrandIdParamInput,
  type UpdateBrandInput,
} from "../schemas/brand.schemas";
import { toBrandAuditValues } from "./brand-audit.mapper";
import {
  BRAND_ENTITY_NAME,
  BRAND_MODULE,
} from "./brand-service.constants";
import type { IBrandTransactionRunner } from "./brand-transaction.runner";

export class UpdateBrandService {
  constructor(private readonly transactionRunner: IBrandTransactionRunner) {}

  async execute(
    params: BrandIdParamInput,
    input: UpdateBrandInput,
  ): Promise<BrandDto> {
    const { id } = parseRequest(BrandIdParamSchema, params);
    const data = parseRequest(UpdateBrandSchema, input);
    const entityId = toBrandId(id);
    const updateData = toUpdateBrandData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(entityId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Brand not found",
          details: { id },
        });
      }

      if (updateData.name !== undefined) {
        const duplicate = await repository.findByName(updateData.name);

        if (duplicate !== null && duplicate.id !== entityId) {
          throw new ConflictError({
            message: "Brand name already exists",
            details: { name: updateData.name },
          });
        }
      }
      const previousValues = toBrandAuditValues(existing);
      const updated = await repository.update(entityId, updateData);

      await auditLogger.log({
        module: BRAND_MODULE,
        entityName: BRAND_ENTITY_NAME,
        recordId: updated.id,
        action: "UPDATE",
        status: "SUCCESS",
        oldValues: previousValues,
        newValues: toBrandAuditValues(updated),
      });

      return toBrandDto(updated);
    });
  }
}
