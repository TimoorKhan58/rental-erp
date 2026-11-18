import type { NextRequest } from "next/server";

import prisma from "@/lib/prisma";
import { SetBusinessPlanSchema } from "@/modules/platform/application/platform-business.schemas";
import { setBusinessPlan } from "@/modules/platform/infrastructure/platform-businesses";
import { runPlatformRoute } from "@/modules/platform/presentation/http/platform-route";
import { parseRequest } from "@/shared/application/validation";

interface PlanRouteContext {
  params: Promise<{ id: string }>;
}

/** Set a business's plan and limits (platform owners only; SaaS phase 4c). */
export async function PUT(request: NextRequest, context: PlanRouteContext): Promise<Response> {
  const { id } = await context.params;
  return runPlatformRoute(request, "businesses.set-plan", async (ctx) => {
    const plan = parseRequest(SetBusinessPlanSchema, await request.json().catch(() => ({})));
    const saved = await setBusinessPlan(prisma, id, plan);

    await ctx.audit({ action: "business.plan_changed", targetOrganizationId: id, details: saved });

    return saved;
  });
}
