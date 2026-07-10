import type { NextRequest } from "next/server";

import { handleGetAuditLogById } from "@/modules/audit/presentation/routes/audit-api.routes";

import { resolveAuditApplicationServices } from "../_composition/resolve-audit-services";

interface AuditRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: AuditRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetAuditLogById(
    request,
    id,
    resolveAuditApplicationServices,
  );
}
