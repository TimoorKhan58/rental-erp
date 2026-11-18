import type { NextRequest } from "next/server";

import prisma from "@/lib/prisma";
import { ResetOwnerPasswordSchema } from "@/modules/platform/application/platform-business.schemas";
import { resetOwnerPassword } from "@/modules/platform/infrastructure/platform-businesses";
import { runPlatformRoute } from "@/modules/platform/presentation/http/platform-route";
import { parseRequest } from "@/shared/application/validation";

interface OwnerPasswordRouteContext {
  params: Promise<{ id: string }>;
}

/** Give the business owner a new temporary password (platform owners only). */
export async function POST(request: NextRequest, context: OwnerPasswordRouteContext): Promise<Response> {
  const { id } = await context.params;
  return runPlatformRoute(request, "businesses.reset-owner-password", async (ctx) => {
    const { temporaryPassword } = parseRequest(ResetOwnerPasswordSchema, await request.json().catch(() => ({})));
    const result = await resetOwnerPassword(prisma, id, temporaryPassword);

    await ctx.audit({
      action: "business.owner_password_reset",
      targetOrganizationId: id,
      details: { ownerEmail: result.ownerEmail },
    });

    return result;
  });
}
