import type { NextRequest } from "next/server";

import prisma from "@/lib/prisma";
import { RemoveBusinessSchema } from "@/modules/platform/application/platform-business.schemas";
import { removeBusiness } from "@/modules/platform/infrastructure/remove-business";
import { runPlatformRoute } from "@/modules/platform/presentation/http/platform-route";
import { parseRequest } from "@/shared/application/validation";

interface RemoveRouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Permanently remove a business that has left (platform owners only; SaaS
 * phase 4d). Allowed 30 days after deactivation and after an export, with a
 * backup confirmed and the short name typed. Audited as business.removed.
 */
export async function POST(request: NextRequest, context: RemoveRouteContext): Promise<Response> {
  const { id } = await context.params;
  return runPlatformRoute(request, "businesses.remove", async (ctx) => {
    const { confirmSlug, backupConfirmed } = parseRequest(
      RemoveBusinessSchema,
      await request.json().catch(() => ({})),
    );
    return removeBusiness(prisma, {
      organizationId: id,
      confirmSlug,
      backupConfirmed,
      platformOwnerId: ctx.owner.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  });
}
