import type { IAuditLogRepository } from "@/modules/audit/domain/audit-log.repository.interface";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { AuditLogDto } from "../dtos/audit-log.dto";
import { toAuditListQuery, toAuditLogDto } from "../mappers/audit-log.mapper";
import {
  ListAuditSchema,
  type ListAuditInput,
} from "../schemas/audit.schemas";

export class ListAuditService {
  constructor(private readonly repository: IAuditLogRepository) {}

  async execute(input: ListAuditInput): Promise<PaginatedResult<AuditLogDto>> {
    const query = parseRequest(ListAuditSchema, input);
    const result = await this.repository.findPaged(toAuditListQuery(query));

    return {
      items: result.items.map(toAuditLogDto),
      meta: result.meta,
    };
  }
}
