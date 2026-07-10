import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import { toBrandId } from "../mappers/brand.mapper";
import {
  BrandIdParamSchema,
  type BrandIdParamInput,
} from "../schemas/brand.schemas";
import { toBrandAuditValues } from "./brand-audit.mapper";
import {
  BRAND_ENTITY_NAME,
  BRAND_MODULE,
} from "./brand-service.constants";
import type { IBrandTransactionRunner } from "./brand-transaction.runner";

export class DeleteBrandService {
  constructor(private readonly transactionRunner: IBrandTransactionRunner) {}

  async execute(input: BrandIdParamInput): Promise<void> {
    const { id } = parseRequest(BrandIdParamSchema, input);
    const entityId = toBrandId(id);

    await this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(entityId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Brand not found",
          details: { id },
        });
      }

      await repository.delete(entityId);

      await auditLogger.log({
        module: BRAND_MODULE,
        entityName: BRAND_ENTITY_NAME,
        recordId: existing.id,
        action: "DELETE",
        status: "SUCCESS",
        oldValues: toBrandAuditValues(existing),
      });
    });
  }
}
