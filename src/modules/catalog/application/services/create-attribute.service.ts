import { parseRequest } from "@/shared/application/validation";
import { ConflictError } from "@/shared/infrastructure/errors";

import type { AttributeDto } from "../dtos/attribute.dto";
import {
  toCreateAttributeData,
  toAttributeDto,
} from "../mappers/attribute.mapper";
import {
  CreateAttributeSchema,
  type CreateAttributeInput,
} from "../schemas/attribute.schemas";
import { toAttributeAuditValues } from "./attribute-audit.mapper";
import {
  ATTRIBUTE_ENTITY_NAME,
  ATTRIBUTE_MODULE,
} from "./attribute-service.constants";
import type { IAttributeTransactionRunner } from "./attribute-transaction.runner";

export class CreateAttributeService {
  constructor(private readonly transactionRunner: IAttributeTransactionRunner) {}

  async execute(input: CreateAttributeInput): Promise<AttributeDto> {
    const data = parseRequest(CreateAttributeSchema, input);
    const createData = toCreateAttributeData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existingName = await repository.findByName(createData.name);

      if (existingName !== null) {
        throw new ConflictError({
          message: "Product attribute name already exists",
          details: { name: createData.name },
        });
      }
      const entity = await repository.create(createData);

      await auditLogger.log({
        module: ATTRIBUTE_MODULE,
        entityName: ATTRIBUTE_ENTITY_NAME,
        recordId: entity.id,
        action: "CREATE",
        status: "SUCCESS",
        newValues: toAttributeAuditValues(entity),
      });

      return toAttributeDto(entity);
    });
  }
}
