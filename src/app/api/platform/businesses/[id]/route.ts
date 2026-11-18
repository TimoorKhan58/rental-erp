import type { NextRequest } from "next/server";

import prisma from "@/lib/prisma";
import { SetBusinessActiveSchema } from "@/modules/platform/application/platform-business.schemas";
import { setBusinessActive } from "@/modules/platform/infrastructure/platform-businesses";
import { runPlatformRoute } from "@/modules/platform/presentation/http/platform-route";
import { parseRequest } from "@/shared/application/validation";

interface BusinessRouteContext {
  params: Promise<{ id: string }>;
}

/** Deactivate or reactivate a business (platform owners only). */
export async function PATCH(request: NextRequest, context: BusinessRouteContext): Promise<Response> {
  const { id } = await context.params;
  return runPlatformRoute(request, "businesses.set-active", async (ctx) => {
    const { isActive } = parseRequest(SetBusinessActiveSchema, await request.json().catch(() => ({})));
    const result = await setBusinessActive(prisma, id, isActive);

    await ctx.audit({
      action: isActive ? "business.reactivated" : "business.deactivated",
      targetOrganizationId: id,
      details: { sessionsEnded: result.sessionsEnded },
    });

    return result;
  });
}
