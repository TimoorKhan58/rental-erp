import type { NextRequest } from "next/server";

import prisma from "@/lib/prisma";
import { buildBusinessExport } from "@/modules/platform/infrastructure/business-export";
import { toExportResponse } from "@/modules/platform/presentation/http/export-response";
import { authenticatePlatformRequest } from "@/modules/platform/presentation/http/platform-route";
import { runCatchingApiHandler } from "@/shared/infrastructure/http/run-catching-api-handler";

interface ExportRouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Download a business's full data export (platform owners only; SaaS
 * phase 4b), e.g. to hand over when a customer leaves. Audited.
 */
export async function GET(request: NextRequest, context: ExportRouteContext): Promise<Response> {
  const { id } = await context.params;
  return runCatchingApiHandler(request, async () => {
    const ctx = await authenticatePlatformRequest(request);
    const exported = await buildBusinessExport(prisma, id);

    await ctx.audit({
      action: "business.exported",
      targetOrganizationId: id,
      details: { fileName: exported.fileName, totalRecords: exported.totalRecords },
    });

    return toExportResponse(exported, ctx.requestId);
  });
}
