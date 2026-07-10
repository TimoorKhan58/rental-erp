import type { NextRequest } from "next/server";

import { handleListAuditLogs } from "@/modules/audit/presentation/routes/audit-api.routes";

import { resolveAuditApplicationServices } from "./_composition/resolve-audit-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListAuditLogs(request, resolveAuditApplicationServices);
}
