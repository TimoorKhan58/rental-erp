import type { AuditLogId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { AuditLog } from "./audit-log.entity";
import type { AuditListQuery } from "./audit-list.query";

export interface IAuditLogRepository {
  findById(id: AuditLogId): Promise<AuditLog | null>;
  findPaged(query: AuditListQuery): Promise<PaginatedResult<AuditLog>>;
}
