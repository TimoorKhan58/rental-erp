import type { NextRequest } from "next/server";

import prisma from "@/lib/prisma";
import { buildBusinessExport } from "@/modules/platform/infrastructure/business-export";
import { toExportResponse } from "@/modules/platform/presentation/http/export-response";
import { PERMISSIONS, assertPermission } from "@/shared/application/authorization";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";
import {
  authenticateApiRequest,
  runInRequestOrganization,
} from "@/shared/infrastructure/http/authenticate-api-request";
import { runCatchingApiHandler } from "@/shared/infrastructure/http/run-catching-api-handler";

/**
 * Download all of this business's data as a zip (SaaS phase 4b).
 * Owners only (the "change settings" permission); recorded in the audit log.
 */
export async function GET(request: NextRequest): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const { ctx, requestId } = await authenticateApiRequest(request, "/api/settings/export", "GET");
    assertPermission(ctx.request, PERMISSIONS.settings.update);
    const organizationId = ctx.request.tenantId as string;

    const exported = await buildBusinessExport(prisma, organizationId);

    await runInRequestOrganization(ctx, () =>
      createSharedDepsFromExecutionContext(ctx).auditLogger.log({
        module: "settings",
        entityName: "BusinessExport",
        recordId: organizationId,
        action: "EXPORT",
        status: "SUCCESS",
        newValues: { fileName: exported.fileName, totalRecords: exported.totalRecords },
        ipAddress: ctx.request.ipAddress,
        userAgent: ctx.request.userAgent,
        requestId,
      }),
    );

    return toExportResponse(exported, requestId);
  });
}
