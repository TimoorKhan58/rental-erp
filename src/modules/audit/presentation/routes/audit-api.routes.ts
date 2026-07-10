import type { NextRequest } from "next/server";

import type { AuditLogDto } from "@/modules/audit/application/dtos/audit-log.dto";
import type { AuditServiceResolver } from "@/modules/audit/application/services/audit-application-services.interface";
import {
  AuditIdParamSchema,
  ListAuditSchema,
} from "@/modules/audit/application/schemas/audit.schemas";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toAuditLogListResponse,
  toAuditLogResponse,
} from "../mappers/audit-response.mapper";
import {
  runAuditApiRoute,
  toJsonResponse,
} from "../http/audit-api.route-runner";
import { AUDIT_ROUTES } from "./audit.routes";

function parseQuery(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}

export async function handleListAuditLogs(
  request: NextRequest,
  resolveServices: AuditServiceResolver,
): Promise<Response> {
  const listInput = parseRequest(ListAuditSchema, parseQuery(request));

  const result = await runAuditApiRoute({
    request,
    route: AUDIT_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.audit.read,
    resolveServices,
    handler: async (_ctx, services) => services.listAudit.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<AuditLogDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAuditLogListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetAuditLogById(
  request: NextRequest,
  id: string,
  resolveServices: AuditServiceResolver,
): Promise<Response> {
  const params = parseRequest(AuditIdParamSchema, { id });

  const result = await runAuditApiRoute({
    request,
    route: AUDIT_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.audit.read,
    resolveServices,
    handler: async (_ctx, services) => services.getAuditById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAuditLogResponse(result.body.data as AuditLogDto),
      },
    });
  }

  return toJsonResponse(result);
}
