import type { AuditApplicationServices as AuditApplicationServicesBase } from "@/modules/audit/application/services/audit-application-services.interface";
import { AuditService } from "@/modules/audit/application/services/audit.service";
import type { IAuditService } from "@/modules/audit/application/services/audit-application-services.interface";
import { GetAuditByIdService } from "@/modules/audit/application/services/get-audit-by-id.service";
import { ListAuditService } from "@/modules/audit/application/services/list-audit.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createAuditLogRepositoryFromSharedDeps } from "./create-audit-log.repository";

export type { AuditApplicationServicesBase as AuditApplicationServices };

export interface WiredAuditApplicationServices
  extends AuditApplicationServicesBase {
  auditService: IAuditService;
}

export function createAuditApplicationServices(
  deps: SharedDeps,
): WiredAuditApplicationServices {
  const repository = createAuditLogRepositoryFromSharedDeps(deps);

  const listAudit = new ListAuditService(repository);
  const getAuditById = new GetAuditByIdService(repository);

  return {
    listAudit,
    getAuditById,
    auditService: new AuditService(listAudit, getAuditById),
  };
}
