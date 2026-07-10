import { AuditLogNotFoundError } from "@/modules/audit/domain/audit-log.errors";
import type { IAuditLogRepository } from "@/modules/audit/domain/audit-log.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { AuditLogDto } from "../dtos/audit-log.dto";
import {
  toAuditLogDto,
  toAuditLogId,
} from "../mappers/audit-log.mapper";
import {
  AuditIdParamSchema,
  type AuditIdParamInput,
} from "../schemas/audit.schemas";

export class GetAuditByIdService {
  constructor(private readonly repository: IAuditLogRepository) {}

  async execute(input: AuditIdParamInput): Promise<AuditLogDto> {
    const params = parseRequest(AuditIdParamSchema, input);
    const auditLog = await this.repository.findById(toAuditLogId(params.id));

    if (auditLog === null) {
      const notFound = new AuditLogNotFoundError(params.id);
      throw new NotFoundError({
        message: notFound.message,
        details: { id: params.id },
      });
    }

    return toAuditLogDto(auditLog);
  }
}
