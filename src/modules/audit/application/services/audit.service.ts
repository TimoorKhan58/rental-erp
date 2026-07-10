import type { PaginatedResult } from "@/shared/domain/pagination";

import type { AuditLogDto } from "../dtos/audit-log.dto";
import type {
  AuditIdParamInput,
  ListAuditInput,
} from "../schemas/audit.schemas";
import type { IAuditService } from "./audit-application-services.interface";
import { GetAuditByIdService } from "./get-audit-by-id.service";
import { ListAuditService } from "./list-audit.service";

export class AuditService implements IAuditService {
  constructor(
    private readonly listAuditService: ListAuditService,
    private readonly getAuditByIdService: GetAuditByIdService,
  ) {}

  list(input: ListAuditInput): Promise<PaginatedResult<AuditLogDto>> {
    return this.listAuditService.execute(input);
  }

  getById(input: AuditIdParamInput): Promise<AuditLogDto> {
    return this.getAuditByIdService.execute(input);
  }
}
