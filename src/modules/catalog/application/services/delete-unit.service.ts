import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import { toUnitId } from "../mappers/unit.mapper";
import {
  UnitIdParamSchema,
  type UnitIdParamInput,
} from "../schemas/unit.schemas";
import { toUnitAuditValues } from "./unit-audit.mapper";
import {
  UNIT_ENTITY_NAME,
  UNIT_MODULE,
} from "./unit-service.constants";
import type { IUnitTransactionRunner } from "./unit-transaction.runner";

export class DeleteUnitService {
  constructor(private readonly transactionRunner: IUnitTransactionRunner) {}

  async execute(input: UnitIdParamInput): Promise<void> {
    const { id } = parseRequest(UnitIdParamSchema, input);
    const entityId = toUnitId(id);

    await this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(entityId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Unit of measure not found",
          details: { id },
        });
      }

      await repository.delete(entityId);

      await auditLogger.log({
        module: UNIT_MODULE,
        entityName: UNIT_ENTITY_NAME,
        recordId: existing.id,
        action: "DELETE",
        status: "SUCCESS",
        oldValues: toUnitAuditValues(existing),
      });
    });
  }
}
