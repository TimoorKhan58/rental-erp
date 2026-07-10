import type { AuditLogDto } from "../dtos/audit-log.dto";
import type {
  AuditIdParamInput,
  ListAuditInput,
} from "../schemas/audit.schemas";
import type { ExecutionContext } from "@/shared/application/context";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { GetAuditByIdService } from "./get-audit-by-id.service";
import type { ListAuditService } from "./list-audit.service";

export interface AuditApplicationServices {
  listAudit: ListAuditService;
  getAuditById: GetAuditByIdService;
}

export type AuditServiceResolver = (
  ctx: ExecutionContext,
) => AuditApplicationServices;

export interface IAuditService {
  list(input: ListAuditInput): Promise<PaginatedResult<AuditLogDto>>;
  getById(input: AuditIdParamInput): Promise<AuditLogDto>;
}
